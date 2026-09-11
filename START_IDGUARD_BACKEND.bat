@echo off
color 0A
echo ========================================================
echo           IDGUARD SIH 2026 - BACKEND LAUNCHER
echo ========================================================
echo.
echo Starting the Python AI Backend on Port 8000...
cd backend
call venv\Scripts\activate.bat
start "IDGUARD Python API" cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo Starting Cloudflare Tunnel...
echo.
echo ========================================================
echo IMPORTANT INSTRUCTIONS:
echo 1. Look carefully at the text below.
echo 2. Find the link that ends with ".trycloudflare.com"
echo 3. Copy that link!
echo 4. Put it into Vercel as your VITE_API_BASE_URL and Redeploy.
echo ========================================================
echo.
cloudflared.exe tunnel --url http://localhost:8000
pause
