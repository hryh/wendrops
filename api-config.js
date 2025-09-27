// API Configuration for Wallet Analysis
// Get free API keys from:
// - Ethereum: https://etherscan.io/apis
// - Polygon: https://polygonscan.com/apis
// - Arbitrum: https://arbiscan.io/apis
// - Optimism: https://optimistic.etherscan.io/apis
// - Base: https://basescan.org/apis

const API_CONFIG = {
  etherscan: {
    ethereum: 'https://api.etherscan.io/api',
    polygon: 'https://api.polygonscan.com/api',
    arbitrum: 'https://api.arbiscan.io/api',
    optimism: 'https://api-optimistic.etherscan.io/api',
    base: 'https://api.basescan.org/api',
    // Replace 'YourEtherscanAPIKey' with your actual API key
    apiKey: 'YourEtherscanAPIKey'
  },
  public: {
    // Using public RPC endpoints (no API key required)
    ethereum: 'https://eth.llamarpc.com',
    polygon: 'https://polygon-rpc.com',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    base: 'https://mainnet.base.org'
  }
};

// Usage instructions:
// 1. Go to https://etherscan.io/apis and create a free account
// 2. Get your API key
// 3. Replace 'YourEtherscanAPIKey' above with your actual API key
// 4. The tool will automatically use real blockchain data
// 5. Without API keys, it falls back to demo data based on the wallet address

// Alternative: Use Covalent API (more comprehensive but requires registration)
// const COVALENT_API_KEY = 'cqt_rQ...'; // Get from https://www.covalenthq.com/

export default API_CONFIG;

