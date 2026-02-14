@echo off
chcp 65001 > nul
title Cloudflared 설치

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║   ☁️  Cloudflared 설치 스크립트                           ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Check if already installed
where cloudflared > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] cloudflared가 이미 설치되어 있습니다!
    echo.
    cloudflared --version
    echo.
    pause
    exit /b 0
)

echo [*] winget을 통해 cloudflared를 설치합니다...
echo.

:: Install using winget
winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [✓] 설치가 완료되었습니다!
    echo [!] 터미널을 새로 열어야 적용됩니다.
) else (
    echo.
    echo [!] 설치에 실패했습니다.
    echo [?] 관리자 권한으로 다시 시도해주세요.
)

echo.
pause
