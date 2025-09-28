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
    const { targetUsername, userWallet } = req.body;
    
    // In a real implementation, you would:
    // 1. Verify the user's Twitter OAuth token
    // 2. Use Twitter API v2 to check if user follows targetUsername
    // 3. Return the actual follow status
    
    // For demo purposes, simulate verification
    console.log(`Verifying follow: ${userWallet} -> @${targetUsername}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate different success rates
    let isFollowing = false;
    if (targetUsername === 'wendrops_com') {
      isFollowing = Math.random() > 0.1; // 90% success rate
    } else if (targetUsername === 'airdrop_hub') {
      isFollowing = Math.random() > 0.25; // 75% success rate
    } else {
      isFollowing = Math.random() > 0.2; // 80% success rate
    }
    
    res.json({
      success: true,
      isFollowing: isFollowing,
      targetUsername: targetUsername,
      userWallet: userWallet,
      verifiedAt: new Date().toISOString()
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
