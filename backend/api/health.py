import datetime
from fastapi import APIRouter
from services.document_detector import document_detector_service
from services.ocr_service import ocr_service_instance
from services import face_service, liveness_service, forgery_service, risk_engine

router = APIRouter(tags=["Health"])

@router.get("/health")
async def check_health():
    return {
        "status": "online",
        "version": "2.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "modules": {
            "yolo_detector": "online" if document_detector_service else "error",
            "ocr_engine": "online" if ocr_service_instance else "error",
            "face_verification": face_service.get_status().get("status", "not_implemented"),
            "liveness": liveness_service.get_status().get("status", "not_implemented"),
            "forgery_detection": forgery_service.get_status().get("status", "not_implemented"),
            "risk_engine": risk_engine.get_status().get("status", "not_implemented")
        }
    }
