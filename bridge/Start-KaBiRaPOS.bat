@echo off
setlocal

set "APPDIR=C:\Program Files\KaBiRa POS"
set "NODE=%APPDIR%\Runtime\node.exe"
set "SERVER=%APPDIR%\Client\server.cjs"

if not exist "%NODE%" (
    echo ERROR: KaBiRa POS Node runtime was not found.
    pause
    exit /b 1
)

if not exist "%SERVER%" (
    echo ERROR: KaBiRa POS backend server was not found.
    pause
    exit /b 1
)

REM Start backend only if port 3000 is not already listening
powershell.exe -NoProfile -Command "if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath '%NODE%' -ArgumentList '""%SERVER%""' -WindowStyle Hidden }"

REM Wait up to 20 seconds for backend
powershell.exe -NoProfile -Command "$ok=$false; 1..20 | ForEach-Object { if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { $ok=$true; break }; Start-Sleep -Seconds 1 }; if (-not $ok) { exit 1 }"

if errorlevel 1 (
    echo ERROR: KaBiRa POS backend failed to start on port 3000.
    pause
    exit /b 1
)

REM Open KaBiRa POS after backend is ready
start "" "%APPDIR%\Client\index.html"

exit /b 0
