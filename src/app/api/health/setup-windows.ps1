# Windows Setup Script for Dog Daycare Backend
Write-Host "🐕 Dog Daycare Backend - Windows Setup" -ForegroundColor Green
Write-Host "====================================="

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($nodeVersion) {
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
$npmVersion = npm --version
Write-Host "✅ npm $npmVersion installed" -ForegroundColor Green

# Check PostgreSQL service
Write-Host "`nChecking PostgreSQL Service..." -ForegroundColor Yellow
$pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -eq 'Running') {
        Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️ PostgreSQL service exists but not running" -ForegroundColor Yellow
        Write-Host "Starting PostgreSQL service..." -ForegroundColor Cyan
        Start-Service $pgService.Name
    }
} else {
    Write-Host "❌ PostgreSQL service not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install

# Generate Prisma Client
Write-Host "`nGenerating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Push database schema
Write-Host "`nSetting up database..." -ForegroundColor Yellow
npx prisma db push

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000/api/health" -ForegroundColor White
Write-Host "3. Open Prisma Studio: npx prisma studio" -ForegroundColor White