@echo off
setlocal

set "APPDIR=C:\Program Files\KaBiRa POS"
set "NODE=%APPDIR%\Runtime\node.exe"
set "SERVER=%APPDIR%\Client\server.cjs"

if not exist "%NODE%" (
    echo KaBiRa POS Node runtime was not found.
    pause
    exit /b 1
)

if not exist "%SERVER%" (
    echo KaBiRa POS backend server was not found.
    pause
    exit /b 1
)

start "KaBiRa POS Backend" /min "%NODE%" "%SERVER%"

timeout /t 3 /nobreak >nul

start "" "%APPDIR%\Client\index.html"

exit /b 0
