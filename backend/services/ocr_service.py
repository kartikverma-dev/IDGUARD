import cv2
import numpy as np
import re
from typing import List, Dict, Any
import logging
import datetime

logger = logging.getLogger(__name__)

try:
    from paddleocr import PaddleOCR
    PADDLE_OCR_AVAILABLE = True
except ImportError:
    PADDLE_OCR_AVAILABLE = False
    logger.warning("PaddleOCR not installed. OCR will fail.")

class OCRService:
    def __init__(self):
        self.ocr = None
        if PADDLE_OCR_AVAILABLE:
            try:
                self.ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)
                logger.info("PaddleOCR engine initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR: {e}")

    def get_status(self):
        if self.ocr is None:
            return {"status": "failed", "fields": []}
        return {"status": "online", "fields": []}

    def extract_text(self, image_bytes: bytes, detected_fields: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extracts text from the detected fields using PaddleOCR.
        Aggregates text fragments and normalizes field values.
        """
        if self.ocr is None:
            return {
                "status": "failed",
                "engine": "PaddleOCR",
                "fields": [],
                "error": "OCR engine not initialized"
            }

        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {
                    "status": "failed", 
                    "engine": "PaddleOCR", 
                    "fields": [], 
                    "error": "Invalid or unreadable image file"
                }

            img_h, img_w = img.shape[:2]
            
            # Group detected fields by field name to avoid duplicates
            # E.g. if YOLO detected two 'Address' boxes, combine them in reading order (top-to-bottom)
            field_groups: Dict[str, List[Dict[str, Any]]] = {}
            for field in detected_fields:
                field_name = field.get("field", "Unknown")
                if field_name not in field_groups:
                    field_groups[field_name] = []
                field_groups[field_name].append(field)

            ocr_results = []
            all_detected_lines = []
            
            # Sort each group by y1 coordinate (reading order top-to-bottom)
            for field_name, fields in field_groups.items():
                fields.sort(key=lambda f: f["bbox"]["y1"])
                
                combined_texts = []
                confidences = []
                
                for field in fields:
                    bbox = field["bbox"]
                    # Apply small padding (5px) bounded by image dimensions
                    pad = 5
                    x1 = max(0, int(bbox["x1"]) - pad)
                    y1 = max(0, int(bbox["y1"]) - pad)
                    x2 = min(img_w, int(bbox["x2"]) + pad)
                    y2 = min(img_h, int(bbox["y2"]) + pad)
                    
                    crop_img = img[y1:y2, x1:x2]
                    if crop_img.size == 0:
                        continue

                    # Run PaddleOCR
                    res = self.ocr.ocr(crop_img, cls=True)
                    
                    if res and res[0]:
                        # Sort lines inside crop by vertical reading order
                        lines = res[0]
                        # Each line: [box_points, (text, score)]
                        lines.sort(key=lambda l: l[0][0][1] if len(l) > 0 and len(l[0]) > 0 else 0)
                        for line in lines:
                            if len(line) == 2 and len(line[1]) == 2:
                                text_str = str(line[1][0]).strip()
                                score = float(line[1][1])
                                if text_str:
                                    combined_texts.append(text_str)
                                    all_detected_lines.append(text_str)
                                    confidences.append(score)

                if not combined_texts:
                    ocr_results.append({
                        "field": field_name,
                        "text": "",
                        "raw_text": "",
                        "ocr_confidence": 0.0,
                        "validation": {"status": "NOT_DETECTED"}
                    })
                    continue

                # Multi-line handling: join with newline for Address, space for others
                separator = "\n" if field_name == "Address" else " "
                raw_extracted_text = separator.join(combined_texts)
                avg_confidence = float(np.mean(confidences)) if confidences else 0.0

                # Field-specific normalization & semantic validation
                normalized_text, validation_status = self._normalize_and_validate(
                    field_name, raw_extracted_text, avg_confidence
                )
                
                ocr_results.append({
                    "field": field_name,
                    "text": normalized_text,
                    "raw_text": raw_extracted_text,
                    "ocr_confidence": round(avg_confidence, 4),
                    "validation": {"status": validation_status}
                })
                
            return {
                "status": "completed",
                "engine": "PaddleOCR",
                "fields": ocr_results,
                "raw_lines": all_detected_lines
            }

        except Exception as e:
            logger.error(f"OCR Processing Error: {e}")
            return {
                "status": "failed",
                "engine": "PaddleOCR",
                "fields": [],
                "error": "OCR extraction failed. Document quality may be degraded."
            }

    def _normalize_and_validate(self, field_name: str, text: str, confidence: float):
        """
        Applies field-specific normalization, validation, and privacy masking.
        """
        clean_text = text.strip()
        confidence_status = "OCR_CONFIDENT" if confidence > 0.75 else "OCR_LOW_CONFIDENCE"
        
        if field_name == "Aadhaar_Number":
            # Extract only digits
            digits = re.sub(r'\D', '', clean_text)
            if len(digits) == 12:
                # Privacy-aware masking: "XXXX XXXX 1234"
                masked = f"XXXX XXXX {digits[-4:]}"
                # Valid 12-digit structure verified
                status = "VALID_FORMAT" if confidence_status == "OCR_CONFIDENT" else "OCR_LOW_CONFIDENCE"
                return masked, status
            elif len(digits) >= 10:
                # Partial/ambiguous digit count
                masked = f"XXXX XXXX {digits[-4:]}"
                return masked, "OCR_LOW_CONFIDENCE"
            else:
                return "XXXX XXXX ****", "INVALID_FORMAT"

        elif field_name == "DOB":
            # Search for DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
            match = re.search(r'(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})', clean_text)
            if match:
                day, month, year = match.groups()
                try:
                    d, m, y = int(day), int(month), int(year)
                    now_year = datetime.datetime.now().year
                    # Realistic birth year check (between 1900 and current year)
                    if 1900 <= y <= now_year and 1 <= m <= 12 and 1 <= d <= 31:
                        datetime.date(y, m, d)
                        formatted_dob = f"{d:02d}/{m:02d}/{y}"
                        status = "VALID_FORMAT" if confidence_status == "OCR_CONFIDENT" else "OCR_LOW_CONFIDENCE"
                        return formatted_dob, status
                except ValueError:
                    pass
            return clean_text, "INVALID_FORMAT"

        elif field_name == "Gender":
            t_upper = clean_text.upper()
            if "FEMALE" in t_upper or t_upper.startswith("F"):
                return "Female", confidence_status
            elif "MALE" in t_upper or t_upper.startswith("M"):
                return "Male", confidence_status
            elif "TRANS" in t_upper or "OTHER" in t_upper:
                return "Other", confidence_status
            else:
                return clean_text, "INVALID_FORMAT"
        
        elif field_name == "Name":
            # Clean unwanted artifacts, excess spaces
            cleaned = re.sub(r'[^a-zA-Z\s\.\']', '', clean_text)
            normalized = re.sub(r'\s+', ' ', cleaned).strip()
            if len(normalized) >= 2:
                return normalized, confidence_status
            return clean_text, "OCR_LOW_CONFIDENCE"

        elif field_name == "Address":
            # Preserve structure, clean excess whitespace
            lines = [re.sub(r'\s+', ' ', line).strip() for line in clean_text.split('\n') if line.strip()]
            normalized = ", ".join(lines) if lines else clean_text
            return normalized, confidence_status

        return clean_text, confidence_status

# Singleton instance
ocr_service_instance = OCRService()

def get_status():
    return ocr_service_instance.get_status()
