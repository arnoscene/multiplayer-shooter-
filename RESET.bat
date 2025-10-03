@echo off
title Reset Game Server
color 0C

echo ========================================
echo   RESETTING GAME SERVER
echo ========================================
echo.
echo Killing all Node.js processes...

taskkill /F /IM node.exe 2>nul

timeout /t 2 /nobreak >nul

echo.
echo All servers stopped!
echo.
echo You can now run START-GAME.bat again
echo.
pause
