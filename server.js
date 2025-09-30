const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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
  return process.env.X_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/x/callback`;
}

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
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
    setCookie(res, 'x_cv', verifier, { maxAge: 600 });
    setCookie(res, 'x_state', state, { maxAge: 600 });

    const redirectUri = getRedirectUri(req);
    console.log('Using redirect URI:', redirectUri);

    const url = new URL(X_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', X_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', X_SCOPE);
    url.searchParams.set('state', state);
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
      stateMatch: state === cookies.x_state
    });
    
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }
    
    if (!cookies.x_cv || !cookies.x_state) {
      return res.status(400).send('Missing PKCE cookies - please try again');
    }
    
    if (state !== cookies.x_state) {
      return res.status(400).send('State mismatch - possible CSRF attack');
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', String(code));
    params.set('redirect_uri', getRedirectUri(req));
    params.set('code_verifier', cookies.x_cv);
    params.set('client_id', X_CLIENT_ID);

    const tokenRes = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('Token exchange failed', tokenRes.status, txt);
      return res.status(500).send('Token exchange failed');
    }
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

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
    // Clear PKCE cookies
    setCookie(res, 'x_cv', '', { maxAge: 0 });
    setCookie(res, 'x_state', '', { maxAge: 0 });

    res.redirect('/points-system.html?x=connected');
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
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not connected to X' });
    }
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Missing targetUsername' });
    }

    // Get target user id
    const tRes = await fetch(`${X_API}/users/by/username/${encodeURIComponent(targetUsername)}`);
    if (!tRes.ok) return res.status(400).json({ success: false, error: 'Target user lookup failed' });
    const tJson = await tRes.json();
    const targetId = tJson?.data?.id;
    if (!targetId) return res.status(404).json({ success: false, error: 'Target not found' });

    // Get me
    const meRes = await fetch(`${X_API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meRes.ok) return res.status(401).json({ success: false, error: 'Invalid token' });
    const me = await meRes.json();
    const sourceId = me?.data?.id;
    if (!sourceId) return res.status(401).json({ success: false, error: 'Invalid user' });

    // Check following list (single page, up to 1000)
    const fRes = await fetch(`${X_API}/users/${sourceId}/following?max_results=1000`, { headers: { Authorization: `Bearer ${token}` } });
    if (!fRes.ok) return res.status(400).json({ success: false, error: 'Following fetch failed' });
    const fJson = await fRes.json();
    const isFollowing = Array.isArray(fJson.data) && fJson.data.some(u => u.id === targetId);

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

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Points system: http://localhost:${PORT}/points-system.html`);
  console.log(`🔍 Wallet analysis: http://localhost:${PORT}/wallet-analysis.html`);
});
