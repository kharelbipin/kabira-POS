@echo off
setlocal EnableExtensions

REM ============================================================
REM KaBiRa POS Windows Launcher
REM ============================================================

REM Run backend in production mode
set "NODE_ENV=production"

REM Resolve installation directory from this BAT file.
REM This avoids hard-coding C:\Program Files\KaBiRa POS.
set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"

set "CLIENT=%APPDIR%\Client"
set "NODE=%APPDIR%\Runtime\node.exe"
set "SERVER=%CLIENT%\server.cjs"

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

echo.>>"%LAUNCHERLOG%"
echo ============================================================>>"%LAUNCHERLOG%"
echo [%date% %time%] Starting KaBiRa POS>>"%LAUNCHERLOG%"

REM ============================================================
REM Validate installation
REM ============================================================

if not exist "%NODE%" (
    echo [%date% %time%] ERROR: Node runtime not found: %NODE%>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS Node runtime was not found.
    echo.
    echo Expected:
    echo %NODE%
    echo.
    echo See:
    echo %LAUNCHERLOG%
    pause
    exit /b 1
)

if not exist "%SERVER%" (
    echo [%date% %time%] ERROR: Backend server not found: %SERVER%>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS backend server was not found.
    echo.
    echo Expected:
    echo %SERVER%
    echo.
    echo See:
    echo %LAUNCHERLOG%
    pause
    exit /b 1
)

REM ============================================================
REM Check whether the actual KaBiRa backend is already healthy
REM ============================================================

powershell.exe -NoProfile -Command ^
"try { ^
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; ^
    if ($r.status -eq 'ok') { exit 0 } else { exit 1 } ^
} catch { exit 1 }"

if errorlevel 1 goto START_BACKEND

echo [%date% %time%] Backend already running and healthy.>>"%LAUNCHERLOG%"
goto LAUNCH_POS


:START_BACKEND

REM ============================================================
REM Detect port conflict before starting KaBiRa
REM ============================================================

powershell.exe -NoProfile -Command ^
"if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Port 3000 is occupied by another process.>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS cannot start because port 3000 is already
    echo being used by another application.
    echo.
    echo See:
    echo %LAUNCHERLOG%
    pause
    exit /b 1
)

REM ============================================================
REM Start KaBiRa backend
REM ============================================================

echo [%date% %time%] Starting backend...>>"%LAUNCHERLOG%"

REM Clear previous backend startup logs so they describe this launch.
type nul > "%BACKENDLOG%"
type nul > "%BACKENDERR%"

powershell.exe -NoProfile -Command ^
"$env:NODE_ENV='production'; ^
Start-Process ^
-FilePath '%NODE%' ^
-ArgumentList 'server.cjs' ^
-WorkingDirectory '%CLIENT%' ^
-WindowStyle Hidden ^
-RedirectStandardOutput '%BACKENDLOG%' ^
-RedirectStandardError '%BACKENDERR%'"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Failed to create backend process.>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS backend could not be started.
    echo.
    echo Check:
    echo %BACKENDERR%
    pause
    exit /b 1
)

REM ============================================================
REM Wait for actual KaBiRa health endpoint
REM ============================================================

echo [%date% %time%] Waiting for backend health check...>>"%LAUNCHERLOG%"

powershell.exe -NoProfile -Command ^
"$ready=$false; ^
for($i=0; $i -lt 30; $i++) { ^
    try { ^
        $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; ^
        if($r.status -eq 'ok') { ^
            $ready=$true; ^
            break ^
        } ^
    } catch {} ^
    Start-Sleep -Seconds 1 ^
}; ^
if($ready) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Backend failed health check.>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS backend failed to start correctly.
    echo.
    echo Diagnostic logs:
    echo %BACKENDLOG%
    echo %BACKENDERR%
    echo %LAUNCHERLOG%
    echo.
    pause
    exit /b 1
)

echo [%date% %time%] Backend health check PASSED.>>"%LAUNCHERLOG%"


:LAUNCH_POS

REM ============================================================
REM Launch POS through HTTP
REM ============================================================

echo [%date% %time%] Opening http://127.0.0.1:3000>>"%LAUNCHERLOG%"

start "" "http://127.0.0.1:3000"

if errorlevel 1 (
    echo [%date% %time%] ERROR: Unable to open POS browser.>>"%LAUNCHERLOG%"
    echo ERROR: KaBiRa POS is running, but the browser could not be opened.
    echo.
    echo Open this address manually:
    echo http://127.0.0.1:3000
    pause
    exit /b 1
)

echo [%date% %time%] KaBiRa POS launcher completed successfully.>>"%LAUNCHERLOG%"

exit /b 0
