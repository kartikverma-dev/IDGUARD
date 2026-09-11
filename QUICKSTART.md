# IDGUARD - Quickstart Guide (SIH 2026)

Welcome to **IDGUARD** — an AI-powered Automated Identity Verification and Document Forensics system.

---

## ⚡ Fast Run (Zero-Node Required)

The project includes a pre-compiled React production bundle inside `frontend/dist`.  
The FastAPI backend automatically serves the full Web UI + AI Verification Pipeline on a single port!

### Step 1: Install Python Dependencies
Make sure you have Python 3.9 - 3.11 installed. Open a terminal in this folder and run:
```bash
cd backend
pip install -r requirements.txt
```

*(Optional but recommended: use a virtual environment)*
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Start IDGUARD
From the project root folder, simply run:
```bash
python start_backend.py
```
*(Or double-click `run_idguard.bat` on Windows)*

### Step 3: Open in Browser
Open your browser and visit:
👉 **`http://127.0.0.1:8000`**

- Full interactive UI (Live Camera capture, Document Forensics, Passive PAD, Field Extraction) is live!
- Interactive API Docs & Swagger are available at: **`http://127.0.0.1:8000/docs`**

---

## 🛠️ Full Development Mode (Optional)

If you want to modify the React frontend code with hot reloading:

### Step 1: Start Backend
```bash
python start_backend.py
```

### Step 2: Start Frontend Dev Server
In a second terminal:
```bash
cd frontend
npm install
npm run dev -- --port 3000
```
Open **`http://localhost:3000`**.

---

## 📁 Project Architecture & Included Model

- **Model Included**: `models/best.pt` (Trained YOLOv11/YOLOv8 Aadhaar document localizer, 5.35 MB)
- **Forensic Pipeline**: ELA (Error Level Analysis), 2D Fourier Spectrum (FFT), EXIF provenance audit, Passive Presentation Attack Detection (Moire, Specular Glare, Texture Sharpness).
- **Security Check**: Aadhaar Dihedral D5 (Verhoeff) mathematical validation.
- **Documentation**: See `IDGUARD_MASTER_DOCUMENTATION.md` for complete technical deep-dive and SIH presentation notes.
