#!/bin/bash

echo "🚀 Setting up Vercel Environment Variables"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel
echo "🔐 Logging into Vercel..."
vercel login

# Link project
echo "🔗 Linking project..."
vercel link

# Add environment variables
echo "📝 Adding environment variables..."

echo "Adding NODE_ENV..."
vercel env add NODE_ENV
echo "production" | vercel env add NODE_ENV

echo "Adding WALLETCONNECT_BRIDGE..."
vercel env add WALLETCONNECT_BRIDGE
echo "https://bridge.walletconnect.org" | vercel env add WALLETCONNECT_BRIDGE

echo "Adding INFURA_PROJECT_ID..."
echo "Please enter your Infura Project ID:"
read -p "Infura Project ID: " INFURA_ID
vercel env add INFURA_PROJECT_ID
echo "$INFURA_ID" | vercel env add INFURA_PROJECT_ID

echo "✅ Environment variables added!"
echo "🚀 Deploying to production..."
vercel --prod

echo "🎉 Setup complete! Your app is now live on Vercel!"
