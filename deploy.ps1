# Battleconnect Render Deployment Helper (PowerShell)
Write-Host "🚀 Battleconnect Render Deployment Helper" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git remote exists
try {
    $remoteUrl = git remote get-url origin 2>$null
    if ($remoteUrl) {
        Write-Host "✅ Git remote already configured" -ForegroundColor Green
        Write-Host "Remote URL: $remoteUrl" -ForegroundColor Gray
    } else {
        throw "No remote found"
    }
} catch {
    Write-Host "❌ No git remote found" -ForegroundColor Red
    Write-Host ""
    Write-Host "To deploy to Render, you need to:" -ForegroundColor Yellow
    Write-Host "1. Create a new repository on GitHub" -ForegroundColor White
    Write-Host "2. Add it as a remote:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/Battleconnect.git" -ForegroundColor Cyan
    Write-Host "3. Push your code:" -ForegroundColor White
    Write-Host "   git branch -M main" -ForegroundColor Cyan
    Write-Host "   git push -u origin main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then follow the Render deployment steps in README.md" -ForegroundColor Yellow
    exit 1
}

# Check if all changes are committed
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "Commit your changes first:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Cyan
    Write-Host "  git commit -m 'Ready for deployment'" -ForegroundColor Cyan
    exit 1
}

Write-Host "🔍 Pre-deployment checks..." -ForegroundColor Blue

# Test build
Write-Host "📦 Testing build process..." -ForegroundColor Blue
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed - fix errors before deploying" -ForegroundColor Red
    exit 1
}

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Blue
try {
    git push
    Write-Host "✅ Code pushed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Ready for Render deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Click 'New' → 'Web Service'" -ForegroundColor White
Write-Host "3. Connect your GitHub repository" -ForegroundColor White
Write-Host "4. Render will auto-detect the render.yaml configuration" -ForegroundColor White
Write-Host "5. Click 'Create Web Service'" -ForegroundColor White
Write-Host ""
Write-Host "Your app will be available at:" -ForegroundColor Cyan
Write-Host "📱 Frontend: https://battleconnect-frontend.onrender.com" -ForegroundColor Green
Write-Host "🔧 Backend: https://battleconnect-backend.onrender.com" -ForegroundColor Green  
Write-Host "💚 Health: https://battleconnect-backend.onrender.com/health" -ForegroundColor Green
Write-Host ""
Write-Host "🌟 May the Force be with your deployment!" -ForegroundColor Magenta