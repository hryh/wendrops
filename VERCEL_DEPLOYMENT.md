# Vercel Deployment Guide

This guide explains how to deploy the Airdrop Hub to Vercel for production hosting.

## 🚀 Quick Deployment

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project directory**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? `Y`
   - Which scope? `Your account`
   - Link to existing project? `N`
   - What's your project's name? `airdrop-hub`
   - In which directory is your code located? `./`

### Method 2: GitHub Integration

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/airdrop-hub.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub
   - Select your repository
   - Deploy

## 🔧 Configuration

### Environment Variables

Set these in your Vercel dashboard:

```env
NODE_ENV=production
INFURA_PROJECT_ID=your_infura_project_id
WALLETCONNECT_BRIDGE=https://bridge.walletconnect.org
```

### Vercel.json Configuration

The `vercel.json` file is already configured for:
- Node.js serverless functions
- Static file serving
- API routes
- CORS support

## 📁 Project Structure

```
airdrop-hub/
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies
├── server.js           # Main server file
├── index.html          # Main page
├── submit.html         # Submit page
├── points-system.html  # Points system
├── wallet-analysis.html # Wallet analysis
├── terms.html          # Terms page
├── rss.html           # RSS page
├── data/
│   └── data.json      # Airdrop data
└── public/            # Static assets
```

## 🌐 Custom Domain

1. **Add Domain in Vercel**
   - Go to Project Settings
   - Click "Domains"
   - Add your domain

2. **Configure DNS**
   - Add CNAME record pointing to your Vercel URL
   - Or use A records for apex domains

## 🔐 Security Features

### API Protection
- Access key authentication for auto-publish
- CORS configuration
- Rate limiting (can be added)

### Data Security
- Server-side validation
- Input sanitization
- Error handling

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics
- Performance monitoring
- Error tracking

### Custom Monitoring
```javascript
// Add to server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});
```

## 🚀 Performance Optimization

### Static Assets
- All HTML/CSS/JS served as static files
- CDN distribution via Vercel
- Automatic compression

### API Optimization
- Serverless functions
- Cold start optimization
- Response caching

## 🔄 Auto-Deployment

### GitHub Integration
- Automatic deployment on push to main
- Preview deployments for PRs
- Rollback capabilities

### Manual Deployment
```bash
vercel --prod
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version (18+)
- Verify all dependencies in package.json
- Check for syntax errors

#### API Errors
- Verify environment variables
- Check CORS configuration
- Review server logs

#### Static File Issues
- Ensure files are in correct directories
- Check file permissions
- Verify file paths

### Debug Mode
```bash
vercel dev
```

## 📈 Scaling

### Vercel Pro Features
- Increased function execution time
- More bandwidth
- Priority support
- Advanced analytics

### Database Integration
For production, consider adding:
- MongoDB Atlas
- PlanetScale
- Supabase
- Firebase

## 🔧 Advanced Configuration

### Custom Headers
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### Redirects
```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

## 📱 Mobile Optimization

### PWA Features
- Add manifest.json
- Service worker
- Offline support

### Responsive Design
- Mobile-first approach
- Touch-friendly interfaces
- Fast loading

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] Error handling in place
- [ ] HTTPS enforced
- [ ] Security headers added
- [ ] Rate limiting implemented
- [ ] Access controls verified

## 📊 Analytics Setup

### Vercel Analytics
```javascript
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      <Analytics />
    </div>
  );
}
```

### Google Analytics
```html
<!-- Add to head -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🎯 Production Checklist

- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Database connected (if applicable)
- [ ] Analytics configured
- [ ] Error monitoring setup
- [ ] Performance monitoring active
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team access configured

## 🚀 Go Live!

Once everything is configured:

1. **Test thoroughly** on preview URL
2. **Set up monitoring** and alerts
3. **Configure backups** if using database
4. **Update DNS** to point to Vercel
5. **Monitor performance** and user feedback
6. **Scale as needed** based on usage

Your Airdrop Hub is now live on Vercel! 🎉
