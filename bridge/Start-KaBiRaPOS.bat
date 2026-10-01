@echo off
setlocal EnableExtensions

REM ============================================================
REM KaBiRa POS Windows Launcher
REM ============================================================

set "NODE_ENV=production"

REM Resolve installation directory
set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"

set "CLIENT=%APPDIR%\Client"
set "NODE=%APPDIR%\Runtime\node.exe"
set "SERVER=%CLIENT%\server.cjs"

REM Dedicated browser profile for cashier POS
set "CASHIER_PROFILE=%LOCALAPPDATA%\KaBiRaPOS-Cashier"

REM ============================================================
REM Writable application/log directories
REM ============================================================

set "DATADIR=%LOCALAPPDATA%\KaBiRa POS"
set "LOGDIR=%DATADIR%\logs"
set "LAUNCHERLOG=%LOGDIR%\launcher.log"
set "BACKENDLOG=%LOGDIR%\backend.log"
set "BACKENDERR=%LOGDIR%\backend-error.log"

if not exist "%DATADIR%" mkdir "%DATADIR%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
if not exist "%CASHIER_PROFILE%" mkdir "%CASHIER_PROFILE%"

echo.>>"%LAUNCHERLOG%"
echo ============================================================>>"%LAUNCHERLOG%"
echo [%date% %time%] Starting KaBiRa POS>>"%LAUNCHERLOG%"

REM ============================================================
REM Validate installation
REM ============================================================

if not exist "%NODE%" (
    echo [%date% %time%] ERROR: Node runtime not found: %NODE%>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS Node runtime was not found.
    pause
    exit /b 1
)

if not exist "%SERVER%" (
    echo [%date% %time%] ERROR: Backend server not found: %SERVER%>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS backend server was not found.
    pause
    exit /b 1
)

REM ============================================================
REM Check if backend is already healthy
REM ============================================================

powershell.exe -NoProfile -WindowStyle Hidden -Command ^
"try { ^
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; ^
    if ($r.status -eq 'ok') { exit 0 } else { exit 1 } ^
} catch { exit 1 }"

if errorlevel 1 goto START_BACKEND

echo [%date% %time%] Backend already running.>>"%LAUNCHERLOG%"
goto LAUNCH_POS


:START_BACKEND

REM ============================================================
REM Make sure port 3000 is free
REM ============================================================

powershell.exe -NoProfile -WindowStyle Hidden -Command ^
"if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Port 3000 already in use.>>"%LAUNCHERLOG%"
    echo ERROR: Port 3000 is already being used.
    pause
    exit /b 1
)

REM ============================================================
REM Start Node backend hidden
REM ============================================================

echo [%date% %time%] Starting backend...>>"%LAUNCHERLOG%"

type nul > "%BACKENDLOG%"
type nul > "%BACKENDERR%"

powershell.exe -NoProfile -WindowStyle Hidden -Command ^
"$env:NODE_ENV='production'; ^
Start-Process ^
-FilePath '%NODE%' ^
-ArgumentList 'server.cjs' ^
-WorkingDirectory '%CLIENT%' ^
-WindowStyle Hidden ^
-RedirectStandardOutput '%BACKENDLOG%' ^
-RedirectStandardError '%BACKENDERR%'"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Backend failed to start.>>"%LAUNCHERLOG%"
    pause
    exit /b 1
)

REM ============================================================
REM Wait for backend
REM ============================================================

powershell.exe -NoProfile -WindowStyle Hidden -Command ^
"$ready=$false; ^
for($i=0; $i -lt 30; $i++) { ^
    try { ^
        $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; ^
        if($r.status -eq 'ok') { ^
            $ready=$true; ^
            break ^
        } ^
    } catch {} ^
    Start-Sleep -Milliseconds 500 ^
}; ^
if($ready) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Backend health check failed.>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS backend failed to start.
    pause
    exit /b 1
)

echo [%date% %time%] Backend ready.>>"%LAUNCHERLOG%"


:LAUNCH_POS

REM ============================================================
REM Prevent duplicate cashier POS windows
REM ============================================================

powershell.exe -NoProfile -WindowStyle Hidden -Command ^
"$existing = Get-CimInstance Win32_Process -Filter ""Name='msedge.exe'"" -ErrorAction SilentlyContinue ^| ^
Where-Object { $_.CommandLine -like '*KaBiRaPOS-Cashier*' }; ^
if ($existing) { exit 0 } else { exit 1 }"

if not errorlevel 1 (
    echo [%date% %time%] KaBiRa POS cashier window already running.>>"%LAUNCHERLOG%"
    exit /b 0
)

REM ============================================================
REM Locate Microsoft Edge
REM ============================================================

set "EDGE="

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
)

if not defined EDGE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

REM ============================================================
REM Launch POS in standalone APP mode
REM ============================================================

if defined EDGE (

    echo [%date% %time%] Opening KaBiRa POS in Edge App Mode.>>"%LAUNCHERLOG%"

    start "" "%EDGE%" ^
    --app="http://127.0.0.1:3000" ^
    --user-data-dir="%CASHIER_PROFILE%" ^
    --start-maximized ^
    --no-first-run ^
    --no-default-browser-check ^
    --disable-session-crashed-bubble

) else (

    REM Fallback if Edge is unavailable
    echo [%date% %time%] Edge not found. Using default browser.>>"%LAUNCHERLOG%"
    start "" "http://127.0.0.1:3000"

)

echo [%date% %time%] KaBiRa POS launched successfully.>>"%LAUNCHERLOG%"

exit /b 0
