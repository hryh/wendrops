const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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

// Real Twitter API verification endpoint (for production)
app.post('/api/twitter/verify-follow-real', async (req, res) => {
  try {
    const { targetUsername, userWallet, twitterUsername, accessToken } = req.body;
    
    // This would use real Twitter API v2
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: 'Real Twitter API not implemented yet',
      message: 'Please use the simulation endpoint for now'
    });
    
  } catch (error) {
    console.error('Real Twitter API verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
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
