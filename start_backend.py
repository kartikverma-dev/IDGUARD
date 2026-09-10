import sys
import os

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_root, "backend")
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)

    print("==================================================")
    print(" IDGUARD BACKEND SERVER (FastAPI + YOLO + OCR)")
    print(" Running on: http://127.0.0.1:8000")
    print(" Swagger Docs: http://127.0.0.1:8000/docs")
    print(" Health API: http://127.0.0.1:8000/api/health")
    print("==================================================")
    sys.stdout.flush()

    import uvicorn
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    main()
