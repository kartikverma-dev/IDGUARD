import subprocess
import sys
import os

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(project_root, "frontend")

    print("==================================================")
    print(" IDGUARD FRONTEND SERVER (React + Vite + Tailwind)")
    print(" Running on: http://localhost:3000")
    print(" Press Ctrl+C to stop.")
    print("==================================================")

    # Use shell=True for npm on Windows
    cmd = ["npm", "run", "dev", "--", "--port", "3000"]

    try:
        proc = subprocess.Popen(cmd, cwd=frontend_dir, shell=True)
        proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down frontend server...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("Frontend server stopped.")

if __name__ == "__main__":
    main()
