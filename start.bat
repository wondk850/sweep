@echo off
chcp 65001 > nul
title Sweep 서버 시작

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║   🧹  Sweep - 영어 순서배열 앱                            ║
echo  ║   Made by Wonsummer Studio                                ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Check if cloudflared is installed
where cloudflared > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] cloudflared가 설치되어 있지 않습니다.
    echo [*] 설치하려면 install-cloudflared.bat 을 먼저 실행하세요.
    echo.
    pause
    exit /b 1
)

:: Set variables
set PORT=8080
set APP_DIR=%~dp0

echo [*] 로컬 서버를 시작합니다... (포트: %PORT%)
echo.

:: Start Python HTTP server in background
start /b python -m http.server %PORT% --directory "%APP_DIR%"

:: Wait a moment for server to start
timeout /t 2 /nobreak > nul

echo [✓] 로컬 서버 시작 완료!
echo [*] Cloudflare Tunnel을 시작합니다...
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

:: Start cloudflared tunnel
cloudflared tunnel --url http://localhost:%PORT%

:: This will run until user presses Ctrl+C
echo.
echo [*] 서버가 종료되었습니다.
pause
