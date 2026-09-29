@echo off
setlocal

set "APPDIR=C:\Program Files\KaBiRa POS"
set "CLIENT=%APPDIR%\Client"
set "NODE=%APPDIR%\Runtime\node.exe"
set "SERVER=%CLIENT%\server.cjs"

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

REM Check whether backend is already running
powershell.exe -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    REM Start backend using the Client directory as its working directory
    powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%NODE%' -ArgumentList '""%SERVER%""' -WorkingDirectory '%CLIENT%' -WindowStyle Hidden"
)

REM Wait up to 20 seconds for port 3000
powershell.exe -NoProfile -Command "$ready=$false; for($i=0;$i -lt 20;$i++){ if(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue){$ready=$true;break}; Start-Sleep -Seconds 1 }; if($ready){exit 0}else{exit 1}"

if errorlevel 1 (
    echo ERROR: KaBiRa POS backend failed to start.
    echo Please contact KaBiRa POS support.
    pause
    exit /b 1
)

REM Backend is ready - launch POS
start "" "http://127.0.0.1:3000"
exit /b 0
