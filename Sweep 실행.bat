@echo off
chcp 65001 > nul 2>&1
title Sweep - English Arrangement App

echo.
echo  ========================================================
echo    Sweep - v2.1 (Grammar Hints + Reset Button)
echo    Made by Wonsummer Studio
echo  ========================================================
echo.

:: Check cloudflared
where cloudflared > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] cloudflared is not installed.
    echo [*] Installing...
    winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
    echo.
    echo [!] Installation complete! Please close this window and run again.
    pause
    exit /b
)

set PORT=8080

:: Kill any existing server on the port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)
timeout /t 1 /nobreak > nul

echo [1/3] Starting local server...
start /b python -m http.server %PORT% --directory "C:\Users\wondk\.gemini\antigravity\scratch\sweep"
timeout /t 2 /nobreak > nul

echo [2/3] Opening browser...
start http://localhost:%PORT%

echo [3/3] Starting Cloudflare Tunnel...
echo.
echo  ========================================================
echo   Wait for the URL below, then share with students!
echo   (Look for: https://xxx.trycloudflare.com)
echo  ========================================================
echo.

cloudflared tunnel --url http://localhost:%PORT%

pause
