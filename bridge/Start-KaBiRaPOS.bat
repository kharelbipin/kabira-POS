@echo off
setlocal
set "NODE_ENV=production"
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

REM Check whether the actual KaBiRa POS backend is already healthy
powershell.exe -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
    REM Start backend using the Client directory as its working directory
    powershell.exe -NoProfile -Command "Start-Process -FilePath '%NODE%' -ArgumentList '""%SERVER%""' -WorkingDirectory '%CLIENT%'"
)

REM Create writable KaBiRa log directory
set "LOGDIR=%LOCALAPPDATA%\KaBiRa POS\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

REM Wait up to 30 seconds for the actual KaBiRa backend health endpoint
powershell.exe -NoProfile -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if($r.status -eq 'ok'){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if($ready){exit 0}else{exit 1}"

if errorlevel 1 (
    echo [%date% %time%] ERROR: KaBiRa POS backend failed health check.>>"%LOGDIR%\launcher.log"
    echo ERROR: KaBiRa POS could not start.
    echo Startup information was saved to:
    echo %LOGDIR%\launcher.log
    pause
    exit /b 1
)

echo [%date% %time%] KaBiRa POS backend health check passed.>>"%LOGDIR%\launcher.log"
REM Backend is ready - launch POS
start "" "http://127.0.0.1:3000"

exit /b 0
