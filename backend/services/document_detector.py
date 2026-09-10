import os
import time
import logging
from typing import List, Dict, Any
from ultralytics import YOLO
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Class ID mapping for custom YOLO Aadhaar detector
CLASS_MAP = {
    0: "Aadhaar_Number",
    1: "DOB",
    2: "Gender",
    3: "Name",
    4: "Address"
}

class DocumentDetectorService:
    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        project_root = os.path.dirname(backend_dir)
        candidates = [
            os.path.join(project_root, "models", "best.pt"),
            os.path.join(backend_dir, "models", "document_detector", "best.pt"),
            os.path.join(project_root, "models", "document_detector", "best.pt"),
            os.path.join(backend_dir, "models", "best.pt"),
        ]
        self.model_path = next((p for p in candidates if os.path.exists(p)), candidates[0])
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                logger.info(f"Loaded YOLO model from {self.model_path}")
            else:
                logger.warning(f"Model file not found at {self.model_path}.")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")

    def detect_document_fields(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Runs the YOLO document field detection on the provided image bytes.
        """
        start_time = time.time()
        
        if self.model is None:
            return {
                "fields": [],
                "processing_time_ms": 0.0,
                "error": "Document detector model not loaded"
            }

        try:
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {
                    "fields": [],
                    "processing_time_ms": 0.0,
                    "error": "Failed to decode image. Unsupported or corrupted format."
                }

            # Run inference with verbose=False to keep logs clean
            results = self.model(img, verbose=False)
            
            detected_fields = []
            
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()
                    
                    field_name = CLASS_MAP.get(cls_id, "Unknown")
                    
                    detected_fields.append({
                        "field": field_name,
                        "confidence": round(conf, 4),
                        "bbox": {
                            "x1": round(xyxy[0], 2),
                            "y1": round(xyxy[1], 2),
                            "x2": round(xyxy[2], 2),
                            "y2": round(xyxy[3], 2)
                        }
                    })

            processing_time_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "fields": detected_fields,
                "processing_time_ms": processing_time_ms,
                "error": None
            }

        except Exception as e:
            logger.error(f"Error during document detection: {e}")
            return {
                "fields": [],
                "processing_time_ms": 0.0,
                "error": "Detection failure on image"
            }

# Singleton instance
document_detector_service = DocumentDetectorService()
