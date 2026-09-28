# ==============================================================================
# KABIRA POS - WINDOWS HARDWARE BRIDGE SERVICE INSTALLER SCRIPT
# Startup: Automatic | Recovery: Restart service automatically after failure
# ==============================================================================

[CmdletBinding()]
param (
    [string]$InstallPath = "$env:ProgramFiles\KaBiRa POS\Bridge",
    [int]$Port = 5055
)

# Enforce Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "ERROR: This installer script must be run as Administrator."
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KABIRA POS HARDWARE BRIDGE SERVICE - INSTALLER" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Create Target Directory
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# 2. Stop and Remove Previous Service if Exists
$serviceName = "KaBiRaPOSBridge"
$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[1/5] Stopping existing KaBiRa POS Hardware Bridge service..." -ForegroundColor Yellow
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete $serviceName | Out-Null
}

# 3. Create Windows Background Service
$binPath = "$InstallPath\KaBiRaPosBridge.exe"
Write-Host "[2/5] Registering Windows Service: $serviceName..." -ForegroundColor Green
New-Service -Name $serviceName `
            -DisplayName "KaBiRa POS Hardware Bridge" `
            -Description "Local Hardware Discovery and Adapter Bridge for KaBiRa POS (Port $Port)" `
            -BinaryPathName "`"$binPath`"" `
            -StartupType Automatic

# 4. Configure Automatic Failure Recovery (Restart Service on Failure)
Write-Host "[3/5] Configuring automatic failure recovery (Auto-Restart)..." -ForegroundColor Green
sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/10000/restart/60000 | Out-Null

# 5. Open Loopback Firewall Rule for Port 5055
Write-Host "[4/5] Opening Windows Firewall rule for loopback port $Port..." -ForegroundColor Green
netsh advfirewall firewall add rule name="KaBiRa POS Hardware Bridge 5055" dir=in action=allow protocol=TCP localport=$Port | Out-Null

# 6. Start Service
Write-Host "[5/5] Starting KaBiRa POS Hardware Bridge service..." -ForegroundColor Green
Start-Service -Name $serviceName

# 7. Verification Probe
Start-Sleep -Seconds 2
try {
    $probe = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/bridge/health" -Method Get -TimeoutSec 3
    if ($probe.status -eq "running") {
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host "SUCCESS: KaBiRa POS Hardware Bridge is RUNNING on http://127.0.0.1:$Port" -ForegroundColor Green
        Write-Host "Status: $($probe.status) | Version: $($probe.version)" -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Warning "Service was registered, but port $Port did not respond immediately. Check $InstallPath\logs."
}
