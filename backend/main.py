from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from api import health, verification
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("IDGUARD_API_KEY", "sih2026-demo-key-change-me")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

app = FastAPI(
    title="IDGUARD API",
    description="Identity Document Verification System",
    version="2.0.0",
    dependencies=[Depends(verify_api_key)]
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for the demo
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(verification.router, prefix="/api")

# Serve the static frontend build
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        # Unmatched API requests must return a proper 404 rather than 200 index.html
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail=f"API endpoint '/{catchall}' not found")
        
        filepath = os.path.abspath(os.path.join(frontend_dist, catchall))
        if filepath.startswith(frontend_dist) and os.path.isfile(filepath):
            return FileResponse(filepath)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
