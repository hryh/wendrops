const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;

// Simple in-memory store for PKCE data (in production, use Redis)
const pkceStore = new Map();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

// No security headers to avoid CSP conflicts

app.use(express.json());
app.use(express.static('.'));

// Basic rate limiting for API routes
const ipRateMap = new Map();
function rateLimit(windowMs = 60 * 1000, max = 120) {
  return (req, res, next) => {
    try {
      const xff = (req.headers['x-forwarded-for'] || '').toString();
      const ip = (xff.split(',')[0] || req.ip || 'unknown').trim();
      const now = Date.now();
      const record = ipRateMap.get(ip);
      if (!record || (now - record.start) > windowMs) {
        ipRateMap.set(ip, { start: now, count: 1 });
        return next();
      }
      record.count += 1;
      if (record.count > max) {
        return res.status(429).json({ error: 'rate_limited' });
      }
      return next();
    } catch (_) { return next(); }
  };
}
app.use('/api/', rateLimit());

// --- Helpers: cookies & PKCE ---
function setCookie(res, name, value, opts = {}) {
  const {
    httpOnly = true,
    secure = true,
    sameSite = 'Lax',
    maxAge = 60 * 60, // 1h
    path = '/'
  } = opts;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
    httpOnly ? 'HttpOnly' : '',
    secure ? 'Secure' : ''
  ].filter(Boolean);
  res.append('Set-Cookie', parts.join('; '));
}

function getCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent((v.join('=') || '').trim());
    return acc;
  }, {});
}

function base64url(input) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(sha256(Buffer.from(verifier)));
  return { verifier, challenge };
}

function getRedirectUri(req) {
  const envUri = process.env.X_REDIRECT_URI ? process.env.X_REDIRECT_URI.trim() : null;
  const constructedUri = `${req.protocol}://${req.get('host')}/api/x/callback`;
  console.log('Redirect URI options:', { envUri, constructedUri, using: envUri || constructedUri });
  return envUri || constructedUri;
}

const X_CLIENT_ID = (process.env.X_CLIENT_ID || '').trim();
const X_CLIENT_SECRET = (process.env.X_CLIENT_SECRET || '').trim();
const X_SCOPE = ['tweet.read','users.read','follows.read','offline.access'].join(' ');
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_API = 'https://api.twitter.com/2';

// --- X OAuth 2.0 (PKCE) ---
app.get('/api/x/login', (req, res) => {
  try {
    console.log('X_CLIENT_ID:', X_CLIENT_ID ? 'Set' : 'Not set');
    console.log('X_REDIRECT_URI:', process.env.X_REDIRECT_URI);
    
    if (!X_CLIENT_ID) {
      return res.status(500).send('X client is not configured');
    }
    const { verifier, challenge } = generatePKCE();
    const state = base64url(crypto.randomBytes(16));
    
    // Store verifier in the state parameter directly (simpler approach)
    const stateWithVerifier = `${state}:${verifier}`;
    
    // Store in both cookies and memory (fallback)
    setCookie(res, 'x_cv', verifier, { 
      maxAge: 600, 
      httpOnly: true, 
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });
    setCookie(res, 'x_state', stateWithVerifier, { 
      maxAge: 600, 
      httpOnly: true, 
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });
    
    // Also store in memory as fallback (keyed by the exact state we send)
    pkceStore.set(stateWithVerifier, { verifier, challenge });
    setTimeout(() => pkceStore.delete(state), 600000); // Clean up after 10 minutes

    const redirectUri = getRedirectUri(req);
    console.log('Using redirect URI:', redirectUri);

    const url = new URL(X_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', X_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', X_SCOPE);
    url.searchParams.set('state', stateWithVerifier);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    
    console.log('Redirecting to:', url.toString());
    res.redirect(url.toString());
  } catch (e) {
    console.error('x/login error', e);
    res.status(500).send('Auth init failed: ' + e.message);
  }
});

app.get('/api/x/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookies = getCookies(req);
    
    console.log('Callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasCv: !!cookies.x_cv, 
      hasStateCookie: !!cookies.x_state,
      stateMatch: state === cookies.x_state,
      stateValue: state,
      cookieStateValue: cookies.x_state,
      memoryStoreKeys: Array.from(pkceStore.keys()),
      memoryStoreHasState: pkceStore.has(state)
    });
    
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }
    
    // Try to get PKCE data from state parameter first, then cookies, then memory store
    let verifier = null;
    let stateValid = false;
    
    // Try to parse verifier from state parameter (format: "state:verifier")
    // Note: state might be URL encoded, so we need to decode it first
    const decodedState = decodeURIComponent(state);
    if (decodedState.includes(':')) {
      const [statePart, verifierPart] = decodedState.split(':', 2);
      if (verifierPart) {
        verifier = verifierPart;
        stateValid = true;
        console.log('Got verifier from state parameter');
      }
    }
    
    if (!verifier) {
      // Fallback to cookies
      verifier = cookies.x_cv;
      if (verifier) {
        stateValid = (state === cookies.x_state);
        console.log('Got verifier from cookies');
      }
    }
    
    if (!verifier) {
      // Fallback to memory store
      const pkceData = pkceStore.get(state);
      if (pkceData) {
        verifier = pkceData.verifier;
        stateValid = true;
        console.log('Got verifier from memory store');
      }
    }
    
    if (!verifier) {
      return res.status(400).send('Missing PKCE data - please try again');
    }
    
    if (!stateValid) {
      return res.status(400).send('State validation failed - please try again');
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', String(code));
    params.set('redirect_uri', getRedirectUri(req));
    params.set('code_verifier', verifier);
    // Include client_id for compatibility with X OAuth token endpoint
    params.set('client_id', X_CLIENT_ID);
    // Note: client_id and client_secret are now in the Authorization header
    
    console.log('Authorization code details:', {
      code: String(code),
      codeLength: String(code).length,
      codeType: typeof code,
      isString: typeof code === 'string'
    });

    // Validate credentials
    if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
      console.error('Missing X credentials:', { 
        hasClientId: !!X_CLIENT_ID, 
        hasClientSecret: !!X_CLIENT_SECRET,
        clientIdLength: X_CLIENT_ID ? X_CLIENT_ID.length : 0,
        clientSecretLength: X_CLIENT_SECRET ? X_CLIENT_SECRET.length : 0
      });
      return res.status(500).send('X client credentials not configured');
    }
    
    // Create Basic Auth header with client credentials
    const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    
    // First attempt: PKCE-style body only (no Authorization header)
    let tokenRes = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: { 
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    console.log('Token request details:', {
      url: X_TOKEN_URL,
      clientId: X_CLIENT_ID,
      redirectUri: getRedirectUri(req),
      hasCode: !!code,
      codeLength: code ? code.length : 0,
      hasVerifier: !!verifier,
      verifierLength: verifier ? verifier.length : 0,
      status: tokenRes.status,
      requestBody: params.toString()
    });
    
    if (!tokenRes.ok) {
      const firstTxt = await tokenRes.text();
      console.error('Token exchange failed (first attempt)', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        response: firstTxt
      });
      // Retry with Basic auth (some configurations require confidential exchange)
      if (X_CLIENT_ID && X_CLIENT_SECRET) {
        const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
        tokenRes = await fetch(X_TOKEN_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          },
          body: params.toString()
        });
      }
      if (!tokenRes.ok) {
        const secondTxt = await tokenRes.text();
        console.error('Token exchange failed (second attempt)', {
          status: tokenRes.status,
          statusText: tokenRes.statusText,
          response: secondTxt
        });
        return res.status(500).send(`Token exchange failed: ${tokenRes.status} - ${secondTxt}`);
      }
    }
    let tokenJson;
    try {
      tokenJson = await tokenRes.json();
    } catch (parseError) {
      console.error('Failed to parse token response:', parseError);
      return res.status(500).send('Invalid token response from X');
    }
    
    if (!tokenJson.access_token) {
      console.error('No access token in response:', tokenJson);
      return res.status(500).send('No access token received from X');
    }
    
    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;

    // Fetch user
    const meRes = await fetch(`${X_API}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const me = meRes.ok ? await meRes.json() : null;
    const userId = me?.data?.id || '';
    const userName = me?.data?.username || '';

    // Store minimal session in httpOnly cookies
    setCookie(res, 'x_token', accessToken, { maxAge: 60 * 60 });
    if (userId) setCookie(res, 'x_uid', userId, { maxAge: 60 * 60 });
    if (userName) setCookie(res, 'x_uname', userName, { maxAge: 60 * 60 });
    if (refreshToken) setCookie(res, 'x_refresh', refreshToken, { maxAge: 7 * 24 * 60 * 60 });
    // Clear PKCE cookies and memory store
    setCookie(res, 'x_cv', '', { 
      maxAge: 0, 
      httpOnly: true, 
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });
    setCookie(res, 'x_state', '', { 
      maxAge: 0, 
      httpOnly: true, 
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });
    pkceStore.delete(state); // Clean up memory store

    res.redirect('/points-system-v4.html?x=connected');
  } catch (e) {
    console.error('x/callback error', e);
    res.status(500).send('Auth callback failed');
  }
});

app.get('/api/x/status', (req, res) => {
  try {
    const cookies = getCookies(req);
    const connected = Boolean(cookies.x_token);
    res.json({ connected, user: connected ? { id: cookies.x_uid || null, username: cookies.x_uname || null } : null });
  } catch (e) {
    res.json({ connected: false });
  }
});

// Debug endpoint to verify current OAuth settings (do not expose sensitive data)
app.get('/api/x/debug-config', (req, res) => {
  try {
    res.json({
      authUrl: X_AUTH_URL,
      tokenUrl: X_TOKEN_URL,
      apiBase: X_API,
      redirectUri: getRedirectUri(req),
      hasClientId: Boolean(X_CLIENT_ID),
      hasClientSecret: Boolean(X_CLIENT_SECRET),
      clientIdLength: X_CLIENT_ID ? X_CLIENT_ID.length : 0,
      clientSecretLength: X_CLIENT_SECRET ? X_CLIENT_SECRET.length : 0
    });
  } catch (e) {
    res.status(500).json({ error: 'debug-failed', details: e.message });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// X logout: clear session cookies
app.post('/api/x/logout', (req, res) => {
  try {
    setCookie(res, 'x_token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    });
    setCookie(res, 'x_refresh', '', {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    });
    setCookie(res, 'x_uid', '', {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    });
    setCookie(res, 'x_uname', '', {
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// Optional: refresh access token using refresh_token (if provided by X)
app.post('/api/x/refresh', async (req, res) => {
  try {
    const cookies = getCookies(req);
    const refreshToken = cookies.x_refresh;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'No refresh token' });

    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
    params.set('client_id', X_CLIENT_ID);

    const tokenRes = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const json = await tokenRes.json();
    if (!tokenRes.ok) return res.status(500).json(json);

    const accessToken = json.access_token;
    const newRefresh = json.refresh_token;
    if (accessToken) setCookie(res, 'x_token', accessToken, { maxAge: 60 * 60 });
    if (newRefresh) setCookie(res, 'x_refresh', newRefresh, { maxAge: 7 * 24 * 60 * 60 });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'refresh_failed' });
  }
});

// Twitter API verification endpoint
app.post('/api/twitter/verify-follow', async (req, res) => {
  try {
    const { targetUsername, userWallet, twitterUsername } = req.body;
    
    console.log(`Verifying follow: ${userWallet} -> @${targetUsername} (via @${twitterUsername})`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // More realistic verification with username validation
    if (!twitterUsername || !/^[a-zA-Z0-9_]{1,15}$/.test(twitterUsername)) {
      return res.json({
        success: false,
        isFollowing: false,
        error: 'Invalid Twitter username format',
        targetUsername: targetUsername,
        userWallet: userWallet
      });
    }
    
    // Simulate different success rates based on target account
    let successRate = 0.2; // Default 20% success rate (more realistic)
    
    if (targetUsername === 'wendrops_com') {
      successRate = 0.3; // 30% success rate for @wendrops_com
    } else if (targetUsername === 'airdrop_hub') {
      successRate = 0.25; // 25% success rate for @airdrop_hub
    }
    
    // Add some randomness based on username to make it feel more realistic
    const usernameHash = twitterUsername.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const adjustedSuccessRate = successRate + (Math.abs(usernameHash) % 10) / 100;
    const isFollowing = Math.random() < adjustedSuccessRate;
    
    res.json({
      success: true,
      isFollowing: isFollowing,
      targetUsername: targetUsername,
      userWallet: userWallet,
      twitterUsername: twitterUsername,
      verifiedAt: new Date().toISOString(),
      method: 'simulation'
    });
    
  } catch (error) {
    console.error('Twitter verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

// Real Twitter API verification endpoint (uses cookie session)
app.post('/api/twitter/verify-follow-real', async (req, res) => {
  try {
    const { targetUsername } = req.body;
    const cookies = getCookies(req);
    const token = cookies.x_token;
    
    console.log('Verify follow request:', { targetUsername, hasToken: !!token });
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not connected to X' });
    }
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Missing targetUsername' });
    }

    // Get target user id using app bearer to avoid user-token scope limitations
    const rawBearer = process.env.X_BEARER_TOKEN ? process.env.X_BEARER_TOKEN.trim() : '';
    const appBearer = rawBearer ? decodeURIComponent(rawBearer) : '';
    console.log('Environment check:', {
      hasBearerToken: !!process.env.X_BEARER_TOKEN,
      rawLength: rawBearer.length,
      decodedLength: appBearer.length,
      bearerPreview: appBearer ? appBearer.substring(0, 20) + '...' : 'none',
      usingBearer: !!appBearer
    });
    
    const tRes = await fetch(`${X_API}/users/by/username/${encodeURIComponent(targetUsername)}`, {
      headers: { Authorization: `Bearer ${appBearer || token}` }
    });
    
    if (!tRes.ok) {
      const errorText = await tRes.text();
      console.error('Target lookup failed:', tRes.status, errorText);
      return res.status(400).json({ success: false, error: `Target user lookup failed: ${tRes.status} ${errorText}` });
    }
    
    const tJson = await tRes.json();
    const targetId = tJson?.data?.id;
    if (!targetId) return res.status(404).json({ success: false, error: 'Target not found' });

    // Get me
    const meRes = await fetch(`${X_API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meRes.ok) {
      const errorText = await meRes.text();
      console.error('Me lookup failed:', meRes.status, errorText);
      return res.status(401).json({ success: false, error: `Invalid token: ${meRes.status} ${errorText}` });
    }
    
    const me = await meRes.json();
    const sourceId = me?.data?.id;
    if (!sourceId) return res.status(401).json({ success: false, error: 'Invalid user' });

    // Check following list (single page, up to 1000) - MUST use the user's OAuth token
    const fRes = await fetch(`${X_API}/users/${sourceId}/following?max_results=1000`, { headers: { Authorization: `Bearer ${token}` } });
    if (!fRes.ok) {
      const errorText = await fRes.text();
      console.error('Following fetch failed:', fRes.status, errorText);
      return res.status(400).json({ success: false, error: `Following fetch failed: ${fRes.status} ${errorText}` });
    }
    
    const fJson = await fRes.json();
    const isFollowing = Array.isArray(fJson.data) && fJson.data.some(u => u.id === targetId);

    console.log('Verification result:', { isFollowing, targetId, sourceId });
    res.json({ success: true, isFollowing, method: 'twitter_v2' });
  } catch (error) {
    console.error('Real Twitter API verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed', message: error.message });
  }
});

// Auto-publish endpoint for submissions
app.post('/api/auto-publish', async (req, res) => {
  try {
    const { airdropData, accessKey } = req.body;
    
    // Verify access key
    if (accessKey !== 'airdrop2024') {
      return res.status(401).json({
        success: false,
        error: 'Invalid access key'
      });
    }
    
    // Validate airdrop data
    if (!airdropData || !airdropData.name || !airdropData.chain) {
      return res.status(400).json({
        success: false,
        error: 'Invalid airdrop data'
      });
    }
    
    // Generate unique ID
    const airdropId = `airdrop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add metadata
    const newAirdrop = {
      id: airdropId,
      ...airdropData,
      addedDate: new Date().toISOString(),
      status: 'live',
      featured: false,
      verified: true
    };
    
    // In a real implementation, you would:
    // 1. Save to database
    // 2. Update the data.json file
    // 3. Trigger a rebuild of the frontend
    // 4. Send notifications
    
    console.log('Auto-publishing airdrop:', newAirdrop.name);
    
    // Simulate success
    res.json({
      success: true,
      message: 'Airdrop published successfully!',
      airdropId: airdropId,
      publishedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Auto-publish error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish airdrop',
      message: error.message
    });
  }
});

// Get all airdrops (for frontend)
app.get('/api/airdrops', (req, res) => {
  try {
    // In a real implementation, this would fetch from database
    // For now, return the static data
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'data', 'data.json');
    
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      res.json({
        success: true,
        airdrops: data.airdrops || []
      });
    } else {
      res.json({
        success: true,
        airdrops: []
      });
    }
  } catch (error) {
    console.error('Error fetching airdrops:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch airdrops'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---------------- Airdrops (Redis-backed with file fallback) ----------------
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();

function requireAdmin(req, res) {
  try {
    const hdr = req.headers || {};
    let token = hdr['x-admin-token'] || hdr['X-Admin-Token'] || hdr['authorization'] || req.query.token || (req.body && req.body.token) || '';
    if (typeof token !== 'string') token = String(token || '');
    // Support Authorization: Bearer <token>
    if (/^bearer\s+/i.test(token)) token = token.replace(/^bearer\s+/i, '');
    try { token = decodeURIComponent(token); } catch {}
    token = token.trim();
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      console.warn('Admin auth failed', { hasEnv: !!ADMIN_TOKEN, envLen: ADMIN_TOKEN.length, providedLen: token.length });
      res.status(401).json({ success: false, error: 'unauthorized' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'unauthorized' });
    return false;
  }
}

// Fetch all airdrops
app.get('/api/airdrops', async (req, res) => {
  try {
    if (useRedis) {
      const all = await redisCmd([["HGETALL", "airdrops:byId"]]);
      const flat = all?.[0]?.result || [];
      const out = [];
      for (let i = 0; i < flat.length; i += 2) {
        const id = flat[i];
        const json = flat[i + 1];
        try { out.push(JSON.parse(json)); } catch {}
      }
      return res.json({ success: true, airdrops: out });
    }
    // Fallback to static file
    const fs = require('fs');
    const p = path.join(__dirname, 'data', 'data.json');
    if (fs.existsSync(p)) {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      return res.json({ success: true, airdrops: Array.isArray(arr) ? arr : (arr.airdrops || []) });
    }
    return res.json({ success: true, airdrops: [] });
  } catch (e) {
    console.error('airdrops list error', e);
    res.status(500).json({ success: false, error: 'list_failed' });
  }
});

// Add a new airdrop
app.post('/api/airdrops/add', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const a = req.body || {};
    if (!a.name || !a.chain) return res.status(400).json({ success: false, error: 'invalid_payload' });
    const slug = (a.id || a.name || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const id = slug || `airdrop-${Date.now()}`;
    const now = new Date().toISOString();
    const airdrop = {
      id,
      name: a.name,
      chain: a.chain,
      rewardUSD: Number(a.rewardUSD || 0),
      status: a.status || 'live',
      deadline: a.deadline || null,
      tasks: Array.isArray(a.tasks) ? a.tasks : [],
      tags: Array.isArray(a.tags) ? a.tags : [],
      popularity: Number(a.popularity || 0),
      featured: Boolean(a.featured),
      featuredOrder: a.featured ? Number(a.featuredOrder || 0) : undefined,
      description: a.description || '',
      links: a.links || {},
      addedDate: now
    };
    if (useRedis) {
      try {
        await redisCmd([["HSET", "airdrops:byId", id, JSON.stringify(airdrop)]]);
        return res.json({ success: true, id });
      } catch (e) {
        console.error('Redis HSET failed, falling back to file', e);
      }
    }
    // File fallback (or when Redis fails)
    const fs = require('fs');
    const p = path.join(__dirname, 'data', 'data.json');
    let arr = [];
    if (fs.existsSync(p)) arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(arr)) arr = [];
    arr.push(airdrop);
    fs.writeFileSync(p, JSON.stringify(arr, null, 2));
    res.json({ success: true, id });
  } catch (e) {
    console.error('airdrops add error', e);
    res.status(500).json({ success: false, error: 'add_failed' });
  }
});

// Update an existing airdrop (by id)
app.post('/api/airdrops/update', async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { id, updates } = req.body || {};
    if (!id || !updates) return res.status(400).json({ success: false, error: 'invalid_payload' });
    if (useRedis) {
      try {
        const got = await redisCmd([["HGET", "airdrops:byId", id]]);
        const cur = got?.[0]?.result ? JSON.parse(got[0].result) : null;
        if (!cur) return res.status(404).json({ success: false, error: 'not_found' });
        const merged = { ...cur, ...updates };
        await redisCmd([["HSET", "airdrops:byId", id, JSON.stringify(merged)]]);
        return res.json({ success: true });
      } catch (e) {
        console.error('Redis update failed, falling back to file', e);
      }
    }
    // File fallback
    const fs = require('fs');
    const p = path.join(__dirname, 'data', 'data.json');
    if (!fs.existsSync(p)) return res.status(404).json({ success: false, error: 'not_found' });
    let arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!Array.isArray(arr)) arr = [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'not_found' });
    arr[idx] = { ...arr[idx], ...updates };
    fs.writeFileSync(p, JSON.stringify(arr, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error('airdrops update error', e);
    res.status(500).json({ success: false, error: 'update_failed' });
  }
});

// Leaderboard storage: Upstash Redis (if configured) with in-memory fallback
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_TOKEN;
const useRedis = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
const localLeaderboard = [];

async function redisCmd(bodyArray) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyArray)
  });
  if (!res.ok) throw new Error('KV request failed ' + res.status);
  return res.json();
}

app.post('/api/leaderboard/submit', async (req, res) => {
  try {
    const { wallet, points, username } = req.body || {};
    if (!wallet || typeof points !== 'number') return res.status(400).json({ success: false, error: 'Invalid payload' });

    if (useRedis) {
      const cmds = [
        ["ZADD", "leaderboard", points, wallet]
      ];
      if (username) cmds.push(["SET", `uname:${wallet}`, username]);
      await redisCmd(cmds);
    } else {
      const existing = localLeaderboard.find(x => x.wallet === wallet);
      if (existing) { existing.points = points; existing.username = username || existing.username; existing.updatedAt = Date.now(); }
      else { localLeaderboard.push({ wallet, points, username: username || null, updatedAt: Date.now() }); }
      localLeaderboard.sort((a,b)=>b.points-a.points);
    }
    res.json({ success: true });
  } catch (e) {
    console.error('leaderboard submit error', e);
    res.status(500).json({ success: false });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    if (useRedis) {
      // Get top 100 with scores
      const range = await redisCmd([["ZREVRANGE", "leaderboard", 0, 99, "WITHSCORES"]]);
      const arr = Array.isArray(range?.[0]?.result) ? range[0].result : [];
      const out = [];
      for (let i = 0; i < arr.length; i += 2) {
        const wallet = arr[i];
        const points = Number(arr[i+1] || 0);
        out.push({ wallet, points });
      }
      if (out.length > 0) {
        const unameCmds = out.map(x => ["GET", `uname:${x.wallet}`]);
        const names = await redisCmd(unameCmds);
        out.forEach((x, idx) => { x.username = names[idx]?.result || null; });
      }
      return res.json({ success: true, data: out });
    }
    return res.json({ success: true, data: localLeaderboard.slice(0, 100) });
  } catch (e) {
    console.error('leaderboard fetch error', e);
    res.status(500).json({ success: false, data: [] });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Points system: http://localhost:${PORT}/points-system.html`);
  console.log(`🔍 Wallet analysis: http://localhost:${PORT}/wallet-analysis.html`);
});
