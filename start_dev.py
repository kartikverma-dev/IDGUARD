import subprocess
import sys
import os
import time

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_root, "backend")
    frontend_dir = os.path.join(project_root, "frontend")

    print(" Starting IDGUARD Development Servers...")

    # 1. Start the FastAPI backend on port 8000
    print("Backend: Starting Uvicorn on http://127.0.0.1:8000")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
        shell=False
    )

    time.sleep(2)

    # 2. Start the Vite React frontend on port 3000
    print("Frontend: Starting Vite on http://localhost:3000")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "3000"],
        cwd=frontend_dir,
        shell=True  # shell=True is usually required for npm on Windows
    )

    try:
        # Keep the script alive while both servers are running
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
