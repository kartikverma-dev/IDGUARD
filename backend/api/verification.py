from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import uuid
import time
import logging
from typing import Optional, List
from collections import OrderedDict

import json
from schemas.verification import (
    VerificationResponse, 
    ModelInfo, 
    ModuleStatus, 
    OCRModuleStatus, 
    FaceVerificationStatus,
    LivenessModuleStatus,
    ForgeryModuleStatus,
    RiskModuleStatus
)
from services.document_detector import document_detector_service
from services.ocr_service import ocr_service_instance
from services import face_service, liveness_service, forgery_service, risk_engine, aadhaar_qr_service
from services.perspective_warper import auto_rectify_document
import base64
import numpy as np
import cv2

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Verification"])

# Bound in-memory store to prevent memory leaks during long-running service (max 200 items)
MAX_STORE_SIZE = 200
verifications_db = OrderedDict()

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit

# Temporary session directory for auditor manual review inspection
TEMP_SESSION_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp_sessions")
os.makedirs(TEMP_SESSION_DIR, exist_ok=True)
LEDGER_FILE = os.path.join(TEMP_SESSION_DIR, "verifications_ledger.json")

def save_ledger():
    """Persist recent verifications to disk so metrics and history survive restarts."""
    try:
        data = [v.dict() for v in verifications_db.values()]
        with open(LEDGER_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, default=str)
    except Exception as e:
        logger.error(f"Failed to save verifications ledger: {e}")

def load_ledger():
    """Load persistent verifications on server startup."""
    if os.path.exists(LEDGER_FILE):
        try:
            with open(LEDGER_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
            for item in records:
                v = VerificationResponse(**item)
                verifications_db[v.verification_id] = v
            logger.info(f"Loaded {len(verifications_db)} verifications from ledger")
        except Exception as e:
            logger.error(f"Failed to load verifications ledger: {e}")

# Load ledger on module import
load_ledger()

def cleanup_old_session_files():
    try:
        files = [os.path.join(TEMP_SESSION_DIR, f) for f in os.listdir(TEMP_SESSION_DIR)]
        if len(files) > 100:
            files.sort(key=lambda p: os.path.getmtime(p))
            for old_file in files[:30]:
                try:
                    os.remove(old_file)
                except Exception:
                    pass
    except Exception:
        pass


async def validate_image_file(file: UploadFile, field_name: str = "file") -> bytes:
    """Validates file presence, content-type, and size."""
    if not file:
        raise HTTPException(status_code=400, detail=f"Missing {field_name} upload.")
    
    # Check mime type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported format for {field_name}. Please upload a valid image (JPEG, PNG, WEBP)."
        )
    
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail=f"Uploaded file '{file.filename}' is empty.")
    
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413, 
            detail=f"File exceeds maximum allowed size of 15MB."
        )
        
    return content

@router.post("/verification/document", response_model=VerificationResponse)
async def verify_document(file: UploadFile = File(...), selfie: Optional[UploadFile] = File(None)):
    overall_start = time.time()
    
    # Validate and read document image
    image_bytes = await validate_image_file(file, "document")
    
    # 0. Automated 4-Point Perspective Rectification & Deskew
    image_bytes, perspective_rectified = auto_rectify_document(image_bytes)
    
    # Read selfie if provided
    selfie_bytes = None
    if selfie:
        selfie_bytes = await validate_image_file(selfie, "selfie")

    # Generate standardized verification ID
    verification_id = f"VER-2026-{str(uuid.uuid4())[:8].upper()}"
    
    # 1. Document field detection (YOLO)
    t0 = time.time()
    detector_result = document_detector_service.detect_document_fields(image_bytes)
    t_yolo = round((time.time() - t0) * 1000, 2)
    
    if detector_result.get("error"):
        status = "failed"
        fields = []
    else:
        status = "document_detected" if detector_result["fields"] else "no_document_found"
        fields = detector_result["fields"]

    # 2. OCR on detected fields (PaddleOCR)
    t0 = time.time()
    ocr_result = {"status": "not_implemented", "engine": "PaddleOCR", "fields": []}
    if status == "document_detected":
        ocr_result = ocr_service_instance.extract_text(image_bytes, fields)
        if ocr_result.get("error"):
            ocr_result["status"] = "failed"
    t_ocr = round((time.time() - t0) * 1000, 2)

    # 2.5. Cryptographic QR Decoding & Cross-Validation
    doc_cv_img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    qr_data = aadhaar_qr_service.extract_and_decode_qr(doc_cv_img)
    qr_cross_val = None
    if qr_data.get("detected") and qr_data.get("payload", {}).get("parsed"):
        qr_cross_val = aadhaar_qr_service.cross_validate_qr_with_ocr(
            qr_data["payload"].get("demographics", {}),
            ocr_result.get("fields", [])
        )

    # 3. 1:1 Face verification (InsightFace / ArcFace)
    t0 = time.time()
    face_result = {"status": "not_implemented"}
    if selfie_bytes and status == "document_detected":
        face_result = face_service.face_service.verify_faces(image_bytes, selfie_bytes)
    elif status == "document_detected":
        # Document detected but no selfie supplied: check document face
        face_result = {"status": "ready_for_selfie"}
    else:
        face_result = face_service.get_status()
    t_face = round((time.time() - t0) * 1000, 2)

    # 4. Passive Presentation Attack Detection (Liveness / Anti-Spoofing)
    t0 = time.time()
    liveness_result = {"status": "not_implemented"}
    if selfie_bytes:
        liveness_result = liveness_service.analyze_liveness(selfie_bytes)
        if liveness_result.get("result") == "SPOOF_DETECTED" and status == "document_detected":
            status = "manual_review"
    else:
        liveness_result = liveness_service.get_status()
    t_liveness = round((time.time() - t0) * 1000, 2)

    # 5. Document Forgery & Tampering Detection (AI + Watermark + Checksum + QR + ELA)
    t0 = time.time()
    ocr_texts = list(ocr_result.get("raw_lines", []))
    for f in ocr_result.get("fields", []):
        raw_t = f.get("raw_text") or f.get("text", "")
        if raw_t and raw_t not in ocr_texts:
            ocr_texts.append(raw_t)
    forgery_result = forgery_service.analyze_document_forgery(
        image_bytes=image_bytes,
        ocr_texts=ocr_texts,
        detected_fields=fields
    )
    t_forgery = round((time.time() - t0) * 1000, 2)

    # Check for QR tamper alert (swapped credential attack)
    if qr_cross_val and qr_cross_val.get("tamper_alert"):
        forgery_result["is_synthetic_or_spam"] = True
        forgery_result["verdict"] = "SUSPECTED_SPAM_OR_AI"
        forgery_result["indicators"].append("CRITICAL: Printed card text differs from encrypted QR code payload (swapped credential alert)")
        status = "manual_review"

    # 6. Multi-Factor Risk Engine (Synthesizes OCR, PAD, ArcFace, and Forgery signals)
    t0 = time.time()
    risk_result = risk_engine.evaluate_risk(
        ocr_result=ocr_result,
        face_result=face_result,
        liveness_result=liveness_result,
        forgery_result=forgery_result,
        fields_detected=fields
    )
    t_risk = round((time.time() - t0) * 1000, 2)

    total_processing_ms = round((time.time() - overall_start) * 1000, 2)

    # Automatic Quarantine Escalation (routes to manual review queue)
    if face_result.get("result") == "REVIEW" and status == "document_detected":
        status = "manual_review"
    if (risk_result.get("escalate_to_review") or forgery_result.get("is_synthetic_or_spam")) and status == "document_detected":
        status = "manual_review"

    # Save session images to temporary storage for auditor inspection
    cleanup_old_session_files()
    doc_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_doc.jpg")
    try:
        with open(doc_path, "wb") as f:
            f.write(image_bytes)
        doc_url = f"/api/verification/{verification_id}/image/document"
    except Exception as e:
        logger.error(f"Failed to save document image: {e}")
        doc_url = None

    # Cache ELA heatmap if available
    if forgery_result.get("heatmap_base64"):
        ela_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_ela.jpg")
        try:
            b64_str = forgery_result["heatmap_base64"].split(",", 1)[1]
            with open(ela_path, "wb") as f:
                f.write(base64.b64decode(b64_str))
        except Exception as e_ela:
            logger.debug(f"Failed to save ELA heatmap file: {e_ela}")

    selfie_url = None
    if selfie_bytes:
        selfie_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_selfie.jpg")
        try:
            with open(selfie_path, "wb") as f:
                f.write(selfie_bytes)
            selfie_url = f"/api/verification/{verification_id}/image/selfie"
        except Exception as e:
            logger.error(f"Failed to save selfie image: {e}")
            selfie_url = None

    # Normalized timing breakdown
    timing_breakdown = {
        "document_detection_ms": t_yolo,
        "ocr_ms": t_ocr,
        "face_verification_ms": t_face,
        "liveness_ms": t_liveness,
        "forgery_detection_ms": t_forgery,
        "risk_engine_ms": t_risk,
        "total_ms": total_processing_ms
    }

    # Construct the verified normalized response
    response = VerificationResponse(
        verification_id=verification_id,
        document_type="Aadhaar",
        status=status,
        model=ModelInfo(name="idguard-aadhaar-detector", version="v1"),
        fields=fields,
        ocr=OCRModuleStatus(**ocr_result),
        face_verification=FaceVerificationStatus(**face_result),
        liveness=LivenessModuleStatus(**liveness_result),
        forgery=ForgeryModuleStatus(**forgery_result),
        risk=RiskModuleStatus(**risk_result),
        processing_time_ms=total_processing_ms,
        timing_breakdown=timing_breakdown,
        document_image_url=doc_url,
        selfie_image_url=selfie_url,
        perspective_rectified=perspective_rectified,
        qr_validation=qr_cross_val
    )

    # Cache in bounded FIFO store
    if len(verifications_db) >= MAX_STORE_SIZE:
        verifications_db.popitem(last=False)
    verifications_db[verification_id] = response
    save_ledger()
    
    return response

@router.post("/verification/face-match")
async def face_match(document_image: UploadFile = File(...), selfie_image: UploadFile = File(...)):
    """
    Dedicated 1:1 Face Verification endpoint between Document Face and Reference Selfie.
    Uses InsightFace ArcFace embedding cosine similarity.
    """
    doc_bytes = await validate_image_file(document_image, "document_image")
    selfie_bytes = await validate_image_file(selfie_image, "selfie_image")
    
    result = face_service.face_service.verify_faces(doc_bytes, selfie_bytes)
    return result

@router.get("/verification/{verification_id}", response_model=VerificationResponse)
async def get_verification(verification_id: str):
    if verification_id not in verifications_db:
        raise HTTPException(
            status_code=404, 
            detail=f"Verification session '{verification_id}' not found or expired."
        )
    return verifications_db[verification_id]

@router.post("/verification/{verification_id}/flag-review", response_model=VerificationResponse)
async def flag_for_manual_review(verification_id: str):
    """
    Flags a suspicious verification record for human manual review.
    """
    if verification_id not in verifications_db:
        raise HTTPException(
            status_code=404, 
            detail=f"Verification session '{verification_id}' not found or expired."
        )
    record = verifications_db[verification_id]
    record.status = "manual_review"
    if hasattr(record, "face_verification") and record.face_verification:
        record.face_verification.result = "REVIEW"
    save_ledger()
    return record

from pydantic import BaseModel

class ReviewDecisionRequest(BaseModel):
    decision: str  # "approve" or "reject"
    notes: Optional[str] = "Auditor decision submitted"

@router.post("/verification/{verification_id}/review-decision", response_model=VerificationResponse)
async def submit_review_decision(verification_id: str, payload: ReviewDecisionRequest):
    """
    Approve or reject a record currently in the human review queue.
    """
    if verification_id not in verifications_db:
        raise HTTPException(
            status_code=404, 
            detail=f"Verification session '{verification_id}' not found or expired."
        )
    record = verifications_db[verification_id]
    if payload.decision.lower() == "approve":
        record.status = "manual_approved"
        if hasattr(record, "face_verification") and record.face_verification:
            record.face_verification.result = "MATCH"
    else:
        record.status = "manual_rejected"
        if hasattr(record, "face_verification") and record.face_verification:
            record.face_verification.result = "NO_MATCH"
    save_ledger()
    return record

@router.get("/verification/{verification_id}/image/document")
async def get_verification_document_image(verification_id: str):
    """Serve the stored document image for human manual review."""
    doc_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_doc.jpg")
    if not os.path.exists(doc_path):
        raise HTTPException(status_code=404, detail="Document image not found for this session")
    return FileResponse(doc_path, media_type="image/jpeg", filename=f"{verification_id}_document.jpg")

@router.get("/verification/{verification_id}/image/selfie")
async def get_verification_selfie_image(verification_id: str):
    """Serve the stored reference selfie image for human manual review."""
    selfie_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_selfie.jpg")
    if not os.path.exists(selfie_path):
        raise HTTPException(status_code=404, detail="Selfie image not found for this session")
    return FileResponse(selfie_path, media_type="image/jpeg", filename=f"{verification_id}_selfie.jpg")

@router.get("/verification/{verification_id}/image/ela")
async def get_verification_ela_image(verification_id: str):
    """Serve the stored ELA forensic heatmap image for interactive tamper inspection."""
    ela_path = os.path.join(TEMP_SESSION_DIR, f"{verification_id}_ela.jpg")
    if not os.path.exists(ela_path):
        raise HTTPException(status_code=404, detail="ELA heatmap image not found for this session")
    return FileResponse(ela_path, media_type="image/jpeg", filename=f"{verification_id}_ela.jpg")

@router.get("/verifications")
async def list_verifications():
    """Return historical verifications sorted by most recent first."""
    return list(reversed(list(verifications_db.values())))

class ClearRequest(BaseModel):
    scope: Optional[str] = "review"  # "review" or "all"

@router.delete("/verification/{verification_id}")
async def delete_verification(verification_id: str):
    """Delete a single verification session from memory, ledger, and disk."""
    if verification_id not in verifications_db:
        raise HTTPException(
            status_code=404, 
            detail=f"Verification session '{verification_id}' not found."
        )
    del verifications_db[verification_id]
    
    # Remove associated image files
    for suffix in ["_doc.jpg", "_selfie.jpg", "_ela.jpg"]:
        p = os.path.join(TEMP_SESSION_DIR, f"{verification_id}{suffix}")
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception as e:
                logger.error(f"Error removing {p}: {e}")
                
    save_ledger()
    return {"success": True, "message": f"Verification session '{verification_id}' successfully removed."}

@router.post("/verifications/clear")
@router.delete("/verifications/clear")
async def clear_verifications(payload: Optional[ClearRequest] = None, scope: Optional[str] = None):
    """
    Clear verification cases.
    scope='review': Clears only cases currently in 'manual_review' status.
    scope='all': Clears all verification sessions from the ledger.
    """
    chosen_scope = (payload.scope if payload else None) or scope or "review"
    
    if chosen_scope == "review":
        to_delete = [k for k, v in verifications_db.items() if v.status == "manual_review"]
        for k in to_delete:
            del verifications_db[k]
            for suffix in ["_doc.jpg", "_selfie.jpg"]:
                p = os.path.join(TEMP_SESSION_DIR, f"{k}{suffix}")
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
        save_ledger()
        return {
            "success": True, 
            "scope": "review", 
            "deleted_count": len(to_delete),
            "message": f"Successfully cleared {len(to_delete)} pending review case(s)."
        }
    else:
        # Clear all
        count = len(verifications_db)
        verifications_db.clear()
        try:
            for f in os.listdir(TEMP_SESSION_DIR):
                if f.endswith(".jpg"):
                    try:
                        os.remove(os.path.join(TEMP_SESSION_DIR, f))
                    except Exception:
                        pass
        except Exception:
            pass
        save_ledger()
        return {
            "success": True, 
            "scope": "all", 
            "deleted_count": count,
            "message": f"Successfully cleared all {count} verification session(s)."
        }


@router.get("/analytics")
async def get_analytics():
    """Live analytics computed strictly from real verification session data."""
    total = len(verifications_db)
    
    if total == 0:
        return {
            "total_verifications": 0,
            "successful": 0,
            "manual_review": 0,
            "rejected": 0,
            "avg_processing_time": 0
        }
        
    successful = sum(1 for v in verifications_db.values() if v.status in ('document_detected', 'manual_approved'))
    manual_review = sum(1 for v in verifications_db.values() if v.status == 'manual_review')
    rejected = sum(1 for v in verifications_db.values() if v.status in ('failed', 'no_document_found', 'manual_rejected'))
    
    total_time = sum(v.processing_time_ms for v in verifications_db.values() if hasattr(v, 'processing_time_ms') and v.processing_time_ms)
    avg_time = int(total_time / total) if total > 0 else 0
    
    return {
        "total_verifications": total,
        "successful": successful,
        "manual_review": manual_review,
        "rejected": rejected,
        "avg_processing_time": avg_time
    }

DEMO_ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "demo_assets")

@router.get("/demo/sample-document")
async def get_demo_document():
    path = os.path.join(DEMO_ASSETS_DIR, "sample_document.jpg")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Demo document not found")
    return FileResponse(path, media_type="image/jpeg", filename="sample_aadhaar.jpg")

@router.get("/demo/sample-selfie-match")
async def get_demo_selfie_match():
    path = os.path.join(DEMO_ASSETS_DIR, "sample_selfie_match.jpg")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Demo matching selfie not found")
    return FileResponse(path, media_type="image/jpeg", filename="sample_selfie_match.jpg")

@router.get("/demo/sample-selfie-mismatch")
async def get_demo_selfie_mismatch():
    path = os.path.join(DEMO_ASSETS_DIR, "sample_selfie_mismatch.jpg")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Demo mismatching selfie not found")
    return FileResponse(path, media_type="image/jpeg", filename="sample_selfie_mismatch.jpg")

