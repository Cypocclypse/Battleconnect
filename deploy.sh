#!/bin/bash

# Battleconnect Render Deployment Helper
echo "🚀 Battleconnect Render Deployment Helper"
echo "========================================="
echo ""

# Check if git remote exists
if git remote get-url origin >/dev/null 2>&1; then
    echo "✅ Git remote already configured"
    echo "Remote URL: $(git remote get-url origin)"
else
    echo "❌ No git remote found"
    echo ""
    echo "To deploy to Render, you need to:"
    echo "1. Create a new repository on GitHub"
    echo "2. Add it as a remote:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/Battleconnect.git"
    echo "3. Push your code:"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "Then follow the Render deployment steps in README.md"
    exit 1
fi

# Check if all changes are committed
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
    echo "Commit your changes first:"
    echo "  git add ."
    echo "  git commit -m 'Ready for deployment'"
    exit 1
fi

echo "🔍 Pre-deployment checks..."

# Test build
echo "📦 Testing build process..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
if git push; then
    echo "✅ Code pushed successfully"
else
    echo "❌ Push failed"
    exit 1
fi

echo ""
echo "🎉 Ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New' → 'Web Service'"
echo "3. Connect your GitHub repository: $(git remote get-url origin | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')"
echo "4. Render will auto-detect the render.yaml configuration"
echo "5. Click 'Create Web Service'"
echo ""
echo "Your app will be available at:"
echo "📱 Frontend: https://battleconnect-frontend.onrender.com"
echo "🔧 Backend: https://battleconnect-backend.onrender.com"
echo "💚 Health: https://battleconnect-backend.onrender.com/health"
echo ""
echo "🌟 May the Force be with your deployment!"