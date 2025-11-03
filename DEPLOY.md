# Battleconnect Deployment Guide 🚀

## Quick Deploy to Render

### Step 1: Push to GitHub

1. **Create a new GitHub repository:**
   - Go to https://github.com/new
   - Name: `Battleconnect` (or your preferred name)
   - Set to **Public** (required for free Render deployment)
   - Don't initialize with README (we already have one)

2. **Push your local code:**
   ```bash
   # Add GitHub as remote origin
   git remote add origin https://github.com/YOUR_USERNAME/Battleconnect.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render

1. **Connect to Render:**
   - Go to https://render.com
   - Sign up/Login with your GitHub account
   - Grant Render access to your repositories

2. **Deploy via render.yaml:**
   - Click "New +" → "Blueprint"
   - Connect your `Battleconnect` repository
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to deploy both services

3. **Your deployed URLs will be:**
   - Frontend: `https://battleconnect-frontend.onrender.com`
   - Backend: `https://battleconnect-backend.onrender.com`

### Step 3: Configure Environment Variables

Render will automatically set these from `render.yaml`:
- ✅ `NODE_ENV=production`
- ✅ `CORS_ORIGINS=https://battleconnect.onrender.com`
- ✅ `VITE_API_URL=https://battleconnect-backend.onrender.com`

### Alternative: Manual Deploy

If you prefer manual setup over render.yaml:

1. **Deploy Backend:**
   - New Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Deploy Frontend:**
   - New Static Site
   - Connect GitHub repo  
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

## Post-Deployment

### Verify Services
- ✅ Backend health check: `https://battleconnect-backend.onrender.com/health`
- ✅ Frontend loads: `https://battleconnect-frontend.onrender.com`
- ✅ WebSocket connections work
- ✅ Game hosting features functional

### Custom Domain (Optional)
1. Purchase domain from any provider
2. In Render dashboard → Settings → Custom Domains
3. Add your domain and configure DNS

### Monitoring
- Check Render dashboard for logs
- Monitor performance and usage
- Set up uptime monitoring if needed

## Troubleshooting

### Common Issues:

**Build Failures:**
- Check Node.js version compatibility
- Verify all dependencies in package.json
- Review build logs in Render dashboard

**WebSocket Connection Issues:**
- Ensure CORS origins are properly configured
- Check that both services are running
- Verify WebSocket connections in browser dev tools

**Game Hosting Not Working:**
- WebRTC requires HTTPS (Render provides this)
- Check browser permissions for camera/screen sharing
- Ensure users grant necessary permissions

### Support
- Render docs: https://render.com/docs
- Battleconnect issues: Create GitHub issue in your repo

## Environment Variables Reference

| Variable | Service | Purpose |
|----------|---------|---------|
| `NODE_ENV` | Backend | Sets production mode |
| `CORS_ORIGINS` | Backend | Allowed frontend origins |
| `VITE_API_URL` | Frontend | Backend API endpoint |
| `PORT` | Backend | Server port (auto-set by Render) |

---

**🎮 Your Battleconnect coordination system will be live and ready for Star Wars Battlefront II multiplayer coordination!**