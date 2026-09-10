@echo off
title IDGUARD - AI Identity Verification System
echo ===================================================
echo  IDGUARD (SIH 2026) - Fast Launcher
echo  Starting FastAPI Backend & Production Frontend...
echo ===================================================
echo.
echo Opening http://127.0.0.1:8000 in your browser...
start http://127.0.0.1:8000
python start_backend.py
pause
