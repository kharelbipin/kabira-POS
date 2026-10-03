# ==============================================================================
# KABIRA POS - WINDOWS PRODUCTION BUILD PIPELINE SCRIPT
# Deterministic compilation and packaging pipeline for Windows Installer
# ==============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KABIRA POS - PRODUCTION WINDOWS BUILD PIPELINE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $RepoRoot

# 1. npm ci
Write-Host "[1/6] Installing Node dependencies via npm ci..." -ForegroundColor Green
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: npm ci failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

# 2. npm run lint
Write-Host "[2/6] Validating codebase via npm run lint..." -ForegroundColor Green
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: npm run lint failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

# 3. npm run build
Write-Host "[3/6] Building production web and server bundles..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: npm run build failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

# Populate dist/web with web artifacts
$DistWeb = Join-Path $RepoRoot "dist\web"
if (-not (Test-Path $DistWeb)) {
    New-Item -ItemType Directory -Path $DistWeb -Force | Out-Null
}
Get-ChildItem -Path (Join-Path $RepoRoot "dist") -Exclude "web", "bridge", "installer" | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $DistWeb -Recurse -Force
}

# 4. Restore and publish .NET 8 Hardware Bridge
Write-Host "[4/6] Restoring and publishing .NET 8 KaBiRa Hardware Bridge (win-x64)..." -ForegroundColor Green
$BridgeProj = Join-Path $RepoRoot "bridge\csharp\KaBiRaHardwareBridge.csproj"
$DistBridge = Join-Path $RepoRoot "dist\bridge"

dotnet restore $BridgeProj
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: dotnet restore failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

dotnet publish $BridgeProj -c Release -r win-x64 --self-contained true -o $DistBridge
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: dotnet publish failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

# Verify Bridge executable exists
$BridgeExe = Join-Path $DistBridge "KaBiRaPosBridge.exe"
if (-not (Test-Path $BridgeExe)) {
    # Check for KaBiRaHardwareBridge.exe fallback if assembly name differs
    $AltExe = Join-Path $DistBridge "KaBiRaHardwareBridge.exe"
    if (Test-Path $AltExe) {
        Copy-Item -Path $AltExe -Destination $BridgeExe -Force
    } else {
        Write-Error "ERROR: Compiled Bridge binary not found in $DistBridge."
        exit 1
    }
}

# 5. Restore and publish native Customer Display host
Write-Host "[5/7] Restoring and publishing native KaBiRa Customer Display (win-x64)..." -ForegroundColor Green
$CustomerDisplayProj = Join-Path $RepoRoot "bridge\customer-display\KaBiRaCustomerDisplay.csproj"
$DistCustomerDisplay = Join-Path $RepoRoot "dist\customer-display"

dotnet restore $CustomerDisplayProj
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: customer display dotnet restore failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

dotnet publish $CustomerDisplayProj -c Release -r win-x64 --self-contained true -o $DistCustomerDisplay
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: customer display dotnet publish failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

if (-not (Test-Path (Join-Path $DistCustomerDisplay "KaBiRaCustomerDisplay.exe"))) {
    Write-Error "ERROR: KaBiRaCustomerDisplay.exe was not created."
    exit 1
}

# 6. Compile Inno Setup Installer
Write-Host "[6/7] Compiling Inno Setup Windows Installer..." -ForegroundColor Green
$IssScript = Join-Path $RepoRoot "bridge\installer\KabiraPOS-Setup.iss"

# Locate Inno Setup Compiler (ISCC)
$IsccPath = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $IsccPath)) {
    $IsccPath = "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
}
if (-not (Test-Path $IsccPath)) {
    $IsccCmd = Get-Command "iscc" -ErrorAction SilentlyContinue
    if ($IsccCmd) {
        $IsccPath = $IsccCmd.Source
    }
}

if (-not (Test-Path $IsccPath) -and -not (Get-Command "iscc" -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: Inno Setup 6 compiler (ISCC.exe) not found on PATH or Program Files."
    exit 1
}

& $IsccPath $IssScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: Inno Setup compilation failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

# 6. Verify deterministic installer output
Write-Host "[7/7] Verifying deterministic installer artifact..." -ForegroundColor Green
$TargetExe = Join-Path $RepoRoot "dist\installer\KabiraPOS-Setup.exe"

if (-not (Test-Path $TargetExe)) {
    Write-Error "FATAL: Verification failed. '$TargetExe' does not exist."
    exit 1
}

$fileItem = Get-Item $TargetExe
$sizeMb = [math]::Round($fileItem.Length / 1MB, 2)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "SUCCESS: KabiraPOS-Setup.exe generated and verified!" -ForegroundColor Green
Write-Host "Location: $TargetExe" -ForegroundColor Green
Write-Host "Size: $sizeMb MB ($($fileItem.Length) bytes)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
exit 0
