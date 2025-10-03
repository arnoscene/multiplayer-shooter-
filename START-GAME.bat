@echo off
title Multiplayer Shooter - Complete Launcher
color 0A

echo ========================================
echo   MULTIPLAYER SHOOTER - FULL LAUNCH
echo ========================================
echo.
echo Starting game server...
start "Game Server" wsl.exe -d Ubuntu bash -c "cd '/mnt/c/Development/HomeSchool Games/Explorer/server' && node server-manager.js"

timeout /t 3 /nobreak >nul

echo.
echo Getting WSL IP address...

REM Get WSL IP address
for /f "tokens=*" %%a in ('wsl.exe -d Ubuntu hostname -I') do set WSL_IP=%%a
REM Trim spaces
for /f "tokens=1" %%b in ("%WSL_IP%") do set WSL_IP=%%b

echo WSL IP detected: %WSL_IP%

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   GAME IS READY!
echo ========================================
echo.
echo   PLAY NOW:
echo   http://%WSL_IP%:3001
echo.
echo   ADMIN DASHBOARD:
echo   http://%WSL_IP%:3001/admin
echo.

REM Check for public URL
if exist "%~dp0client\server-url.json" (
    for /f "usebackq tokens=*" %%a in (`powershell -Command "(Get-Content '%~dp0client\server-url.json' -Raw | ConvertFrom-Json).url -replace 'wss://', 'https://'"`) do set "SHARE_URL=%%a"

    if defined SHARE_URL (
        echo   SHARE WITH FRIENDS:
        echo   %SHARE_URL%
        echo.
    )
)

echo   Press any key to open the game...
echo ========================================
pause >nul

start http://%WSL_IP%:3001

echo.
echo Game launched! Keep this window open while playing.
echo Close all windows when done.
pause
