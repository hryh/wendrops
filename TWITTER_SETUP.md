# Twitter API Integration Setup

This guide explains how to set up real Twitter API verification for the points system.

## Prerequisites

1. **Twitter Developer Account**: Apply at [developer.twitter.com](https://developer.twitter.com)
2. **Twitter API v2 Access**: Request access to Twitter API v2
3. **OAuth 2.0 App**: Create an OAuth 2.0 application

## Setup Steps

### 1. Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project/app
3. Enable OAuth 2.0
4. Set redirect URI: `http://localhost:3001/auth/twitter/callback`
5. Note down your:
   - Client ID
   - Client Secret
   - Bearer Token

### 2. Environment Variables

Create a `.env` file in the project root:

```env
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here
NODE_ENV=development
```

### 3. Install Additional Dependencies

```bash
npm install dotenv twitter-api-v2
```

### 4. Update server.js

Add Twitter API integration:

```javascript
require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const twitterClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// OAuth 2.0 flow
app.get('/auth/twitter', (req, res) => {
  const authUrl = twitterClient.generateOAuth2AuthLink('http://localhost:3001/auth/twitter/callback', {
    scope: ['tweet.read', 'users.read', 'follows.read']
  });
  res.redirect(authUrl);
});

app.get('/auth/twitter/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    const { client: loggedClient, accessToken } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier: 'your_code_verifier',
      redirectUri: 'http://localhost:3001/auth/twitter/callback'
    });
    
    // Store access token for user
    // In production, store this securely in database
    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify follow endpoint
app.post('/api/twitter/verify-follow', async (req, res) => {
  try {
    const { targetUsername, userWallet, accessToken } = req.body;
    
    // Create client with user's access token
    const userClient = new TwitterApi(accessToken);
    
    // Get user's following list
    const following = await userClient.v2.following(userWallet, {
      max_results: 1000
    });
    
    // Check if target username is in following list
    const isFollowing = following.data.some(user => 
      user.username.toLowerCase() === targetUsername.toLowerCase()
    );
    
    res.json({
      success: true,
      isFollowing,
      targetUsername,
      userWallet
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 5. Update Frontend

Update the points system to handle OAuth flow:

```javascript
// Add Twitter login function
async function connectTwitter() {
  try {
    const response = await fetch('/auth/twitter');
    window.location.href = response.url;
  } catch (error) {
    console.error('Twitter login failed:', error);
  }
}

// Update verification to use real API
async function verifyXFollow() {
  // ... existing code ...
  
  const response = await fetch('/api/twitter/verify-follow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetUsername: username,
      userWallet: userWallet,
      accessToken: userTwitterToken // Get from OAuth flow
    })
  });
  
  // ... rest of verification logic ...
}
```

## Production Considerations

1. **Database Storage**: Store user tokens securely in database
2. **Token Refresh**: Implement token refresh mechanism
3. **Rate Limiting**: Add rate limiting for API calls
4. **Error Handling**: Comprehensive error handling
5. **Security**: Validate all inputs and sanitize data

## Testing

1. Start the server: `npm start`
2. Visit: `http://localhost:3001/points-system.html`
3. Connect wallet and try the verification quests
4. Check server logs for API calls

## Current Demo Mode

The system currently runs in demo mode with simulated verification (80-90% success rate). This allows you to test the UI and flow without Twitter API setup.

To enable real verification, follow the setup steps above and update the environment variables.
