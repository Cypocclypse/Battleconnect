# Battleconnect - Render Deployment

This document provides step-by-step instructions for deploying Battleconnect to Render for instant public access.

## Prerequisites

1. Node.js 18+ and npm installed locally
2. Complete Battleconnect repository cloned
3. Run `npm run setup` to install all dependencies and fix TypeScript errors
4. Push the complete repository to GitHub
5. Create a Render account at [render.com](https://render.com)
6. Set up TURN/STUN credentials (optional but recommended for WebRTC)

## Local Setup First

Before deploying, ensure everything works locally:

```bash
# Install all dependencies and fix TypeScript
npm run setup

# Verify builds work
npm run build

# Test locally
npm run dev
```

Visit `http://localhost:3000` to verify the frontend loads and connects to the backend at `http://localhost:3001`.

## Deployment Steps

### 1. Deploy Backend (Web Service)

1. In Render dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `battleconnect-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or upgrade for production)

4. Set environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGINS=https://battleconnect.onrender.com
   ```

5. Click "Deploy Web Service"

### 2. Deploy Frontend (Static Site)

1. In Render dashboard, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure the site:
   - **Name**: `battleconnect`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Set environment variables:
   ```
   VITE_API_URL=https://battleconnect-backend.onrender.com
   ```

5. Click "Deploy Static Site"

### 3. Configure Custom Domain (Optional)

1. In the frontend service settings, go to "Custom Domains"
2. Add your custom domain (e.g., `battleconnect.yourdomain.com`)
3. Update DNS records as instructed by Render
4. Update backend CORS_ORIGINS environment variable

## Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-assigned by Render) | `10000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `https://battleconnect.onrender.com,https://yourdomain.com` |
| `TURN_URLS` | TURN server URLs for WebRTC | `turn:turnserver.com:3478` |
| `TURN_USERNAME` | TURN server username | `your-username` |
| `TURN_CREDENTIAL` | TURN server password | `your-password` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://battleconnect-backend.onrender.com` |
| `VITE_WS_URL` | WebSocket URL (usually same as API) | `https://battleconnect-backend.onrender.com` |

## Post-Deployment Configuration

### 1. Test the Deployment

1. Visit your frontend URL (e.g., `https://battleconnect.onrender.com`)
2. Verify the connection indicator shows "Connected"
3. Test creating and joining lobbies
4. Test voice chat functionality
5. Verify persistent chat works

### 2. Monitor Performance

1. Check Render service logs for any errors
2. Monitor response times and uptime
3. Set up alerts in Render dashboard

### 3. Scale if Needed

1. Upgrade to paid plans for better performance
2. Consider multiple regions for global users
3. Set up database persistence if needed

## Troubleshooting

### Common Issues

#### Frontend can't connect to backend
- Check CORS_ORIGINS includes frontend URL
- Verify backend service is running
- Check browser console for errors

#### WebRTC connection issues  
- Add TURN server credentials
- Check firewall settings
- Verify HTTPS is working (required for WebRTC)

#### Build failures
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check build logs in Render dashboard

### Service URLs

After deployment, your services will be available at:
- Frontend: `https://battleconnect.onrender.com`
- Backend: `https://battleconnect-backend.onrender.com`
- Health Check: `https://battleconnect-backend.onrender.com/health`

## Security Considerations

1. **HTTPS**: Render provides HTTPS by default
2. **CORS**: Properly configured to only allow your frontend
3. **Rate Limiting**: Built-in protection against abuse
4. **Input Sanitization**: All user input is sanitized
5. **WebSocket Security**: Proper authentication and validation

## Scaling and Performance

### Free Tier Limitations
- Services sleep after 15 minutes of inactivity  
- 500 build minutes per month
- 100GB bandwidth per month

### Production Recommendations
- Upgrade to Starter ($7/month) or higher
- Add Redis for session storage
- Implement database for persistence
- Set up monitoring and alerts
- Consider CDN for global performance

## Maintenance

### Regular Tasks
1. Monitor service health and logs
2. Update dependencies regularly
3. Review and rotate credentials
4. Monitor usage and costs
5. Backup any persistent data

### Updates
1. Push changes to GitHub
2. Render will automatically rebuild and deploy
3. Monitor deployment logs
4. Test functionality after updates

## Support

For deployment issues:
1. Check Render documentation
2. Review service logs in dashboard
3. Test locally first
4. Contact Render support if needed

The deployment process should take 5-10 minutes total. Once complete, share the public HTTPS link with players for instant access to Battleconnect!