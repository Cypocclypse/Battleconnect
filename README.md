# Battleconnect

Battleconnect is a full-screen multiplayer shell for **Star Wars Battlefront II (2017)** that enables players on PC or via PS Remote Play to coordinate and play synchronized matches together — without mods, code injection, or game file modification.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd Battleconnect

# Install all dependencies
npm run setup

# Start development servers
npm run dev
```

The frontend will be available at `http://localhost:3000` and backend at `http://localhost:3001`.

### TypeScript Compilation
```bash
# Build all TypeScript
npm run build

# Run tests
npm run test

# Lint and format
npm run lint:fix
npm run format
```

## 🧱 Architecture

- **Frontend (`frontend/`)**: React + TypeScript full-screen shell
- **Backend (`backend/`)**: Node.js + WebSocket coordination server  
- **Voice (`voice/`)**: WebRTC signaling with STUN/TURN fallback
- **Electron (`electron/`)**: Optional desktop shell for game detection

## 🔐 Security

- No game modification or code injection
- All user input sanitized
- HTTPS required
- WebSocket and WebRTC hardened
- Electron shell sandboxed

## 📁 Project Structure

```
battleconnect/
├── frontend/       # React app with full UI
├── backend/        # Node.js sync server
├── voice/          # WebRTC signaling
├── electron/       # Optional desktop shell
├── tests/          # Unit tests
├── setup.js        # Automated setup script
└── package.json    # Root dependencies
```

## 🌐 Deployment

See `DEPLOYMENT.md` for complete Render deployment instructions.

### Quick Deploy
1. Push to GitHub
2. Connect to Render
3. Deploy backend as Web Service
4. Deploy frontend as Static Site
5. Share public HTTPS link

## 🧪 Development

### Available Scripts
- `npm run setup` - Install all dependencies
- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Check code quality
- `npm run format` - Format code

### Environment Variables

**Backend:**
- `NODE_ENV` - Environment mode
- `PORT` - Server port (auto-assigned on Render)
- `CORS_ORIGINS` - Allowed CORS origins

**Frontend:**
- `VITE_API_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL

## 🎮 Match Flow

1. Launch Battleconnect (browser or Electron)
2. Launch Battlefront II locally
3. Game detection (auto or manual confirm)
4. Join/create lobby
5. Host selects match type
6. Auto team assignment + AI fill
7. Voice chat + persistent text chat
8. Match coordination
9. Lobby dissolves after match

## 🧠 No Shortcuts

Built exactly as specified. Real multiplayer coordination for real Battlefront II matches.