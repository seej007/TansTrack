# Enable Location Permissions - Quick Setup Script
# Run this script from the Commuters directory

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TransiTrack Location Permission Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host "❌ Error: capacitor.config.ts not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Commuters directory:" -ForegroundColor Yellow
    Write-Host "cd C:\Users\usern\Downloads\TransitTrackSys\TansTrack\Commuters" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found Capacitor config" -ForegroundColor Green
Write-Host ""

# Step 1: Check if @capacitor/geolocation is installed
Write-Host "Step 1: Checking Capacitor Geolocation plugin..." -ForegroundColor Cyan
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($packageJson.dependencies.'@capacitor/geolocation') {
    Write-Host "✅ @capacitor/geolocation is already installed" -ForegroundColor Green
} else {
    Write-Host "📦 Installing @capacitor/geolocation..." -ForegroundColor Yellow
    npm install @capacitor/geolocation
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ @capacitor/geolocation installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install @capacitor/geolocation" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 2: Sync with Android
Write-Host "Step 2: Syncing with Android..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Android sync completed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to sync with Android" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Check AndroidManifest.xml
Write-Host "Step 3: Verifying AndroidManifest.xml..." -ForegroundColor Cyan
$manifestPath = "android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw
    if ($manifest -match "ACCESS_FINE_LOCATION") {
        Write-Host "✅ Location permissions found in AndroidManifest.xml" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Location permissions not found in AndroidManifest.xml" -ForegroundColor Yellow
        Write-Host "   Permissions may have been added but sync might be needed" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ AndroidManifest.xml not found" -ForegroundColor Red
}
Write-Host ""

# Step 4: Instructions for next steps
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run the app on your device:" -ForegroundColor White
Write-Host "   ionic capacitor run android --device" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. When prompted, grant location permission" -ForegroundColor White
Write-Host ""
Write-Host "3. Alternative: Grant permission manually via ADB:" -ForegroundColor White
Write-Host "   adb shell pm grant io.ionic.starter android.permission.ACCESS_FINE_LOCATION" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. For emulator, enable mock location:" -ForegroundColor White
Write-Host "   - Open Extended Controls (three dots)" -ForegroundColor Gray
Write-Host "   - Go to Location tab" -ForegroundColor Gray
Write-Host "   - Set coordinates: Lat 10.3157, Lng 123.9068" -ForegroundColor Gray
Write-Host "   - Click Send" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For detailed guide, see:" -ForegroundColor White
Write-Host "   - LOCATION_PERMISSIONS_SETUP.md" -ForegroundColor Cyan
Write-Host "   - EMULATOR_GEOLOCATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
