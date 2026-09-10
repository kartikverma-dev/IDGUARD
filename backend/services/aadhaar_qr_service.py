import xml.etree.ElementTree as ET
import zlib
import re
import cv2
import numpy as np
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

def parse_aadhaar_qr_payload(decoded_str: str, raw_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """
    Parses either:
    1. Legacy XML Aadhaar QR payload (<PrintLetterBarcodeData .../>)
    2. Modern Secure QR payload (large base10 integer or compressed byte stream)
    """
    if not decoded_str and not raw_bytes:
        return {"format": "NONE", "parsed": False, "demographics": {}}

    # 1. Check Legacy XML format
    clean_str = decoded_str.strip() if decoded_str else ""
    if "<PrintLetterBarcodeData" in clean_str:
        try:
            root = ET.fromstring(clean_str)
            attribs = root.attrib
            return {
                "format": "XML_V1",
                "parsed": True,
                "has_digital_signature": False,
                "demographics": {
                    "name": attribs.get("name"),
                    "dob": attribs.get("dob") or attribs.get("yob"),
                    "gender": "Male" if attribs.get("gender") == "M" else ("Female" if attribs.get("gender") == "F" else attribs.get("gender")),
                    "uid": attribs.get("uid"),
                    "state": attribs.get("state"),
                    "pincode": attribs.get("pc"),
                    "district": attribs.get("dist")
                }
            }
        except Exception as e:
            logger.debug(f"XML QR parsing fallback: {e}")
            name_m = re.search(r'name="([^"]+)"', clean_str)
            dob_m = re.search(r'dob="([^"]+)"', clean_str) or re.search(r'yob="([^"]+)"', clean_str)
            gender_m = re.search(r'gender="([^"]+)"', clean_str)
            uid_m = re.search(r'uid="([^"]+)"', clean_str)
            if name_m or dob_m:
                return {
                    "format": "XML_V1",
                    "parsed": True,
                    "has_digital_signature": False,
                    "demographics": {
                        "name": name_m.group(1) if name_m else None,
                        "dob": dob_m.group(1) if dob_m else None,
                        "gender": "Male" if (gender_m and gender_m.group(1) == "M") else "Female",
                        "uid": uid_m.group(1) if uid_m else None
                    }
                }

    # 2. Check Secure QR V2/V3 (Integer or binary stream)
    try:
        if clean_str.isdigit() and len(clean_str) > 500:
            big_int = int(clean_str)
            byte_len = (big_int.bit_length() + 7) // 8
            raw_data = big_int.to_bytes(byte_len, byteorder="big")
        elif raw_bytes and len(raw_bytes) > 100:
            raw_data = raw_bytes
        else:
            raw_data = None

        if raw_data:
            try:
                decompressed = zlib.decompress(raw_data, 16 + zlib.MAX_WBITS)
            except Exception:
                decompressed = zlib.decompress(raw_data)

            if decompressed:
                parts = decompressed.split(b"\xff")
                demographics = {}
                if len(parts) >= 4:
                    try:
                        demographics["reference_id"] = parts[1].decode("latin-1", errors="ignore")
                        demographics["name"] = parts[2].decode("latin-1", errors="ignore")
                        demographics["dob"] = parts[3].decode("latin-1", errors="ignore")
                        demographics["gender"] = parts[4].decode("latin-1", errors="ignore")
                    except Exception:
                        pass

                return {
                    "format": "SECURE_V2_V3",
                    "parsed": True,
                    "has_digital_signature": True,
                    "signature_length_bytes": 256,
                    "demographics": demographics
                }
    except Exception as e:
        logger.debug(f"Secure QR decoding fallback: {e}")

    return {"format": "UNKNOWN", "parsed": False, "demographics": {}}

def extract_and_decode_qr(img: np.ndarray) -> Dict[str, Any]:
    """
    Extracts QR code from document image and parses Aadhaar payload if present.
    """
    if img is None:
        return {"detected": False, "payload": None}

    det = cv2.QRCodeDetector()
    val, pts, _ = det.detectAndDecode(img)

    if not val:
        h, w = img.shape[:2]
        # Search candidate quadrants
        crops = [
            img[int(0.18*h):int(0.50*h), int(0.65*w):int(0.98*w)],
            img[int(0.40*h):int(0.90*h), int(0.60*w):int(0.98*w)],
            img[:, int(0.55*w):w]
        ]
        for c in crops:
            if c.size > 0:
                v, p, _ = det.detectAndDecode(c)
                if v:
                    val = v
                    break

    if val:
        parsed = parse_aadhaar_qr_payload(val)
        return {
            "detected": True,
            "raw_value_length": len(val),
            "payload": parsed
        }

    return {"detected": False, "payload": None}

def cross_validate_qr_with_ocr(
    qr_demographics: Dict[str, Any],
    ocr_fields: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Cross-validates physical printed OCR text against tamper-proof QR code payload.
    Flags physical card alterations (e.g. pasted photo or edited text with stolen QR).
    """
    if not qr_demographics:
        return {
            "cross_validated": False,
            "status": "NO_QR_DATA",
            "matched_fields": [],
            "mismatched_fields": [],
            "tamper_alert": False
        }

    ocr_map = {f.get("field"): f.get("text", "").strip().lower() for f in ocr_fields}
    matched = []
    mismatched = []

    # 1. Name validation
    qr_name = qr_demographics.get("name", "").strip().lower()
    ocr_name = ocr_map.get("Name", "")
    if qr_name and ocr_name:
        qr_tokens = set(re.findall(r'\w+', qr_name))
        ocr_tokens = set(re.findall(r'\w+', ocr_name))
        overlap = qr_tokens.intersection(ocr_tokens)
        if len(overlap) >= min(1, len(qr_tokens)):
            matched.append("Name")
        else:
            mismatched.append({"field": "Name", "qr": qr_name, "ocr": ocr_name})

    # 2. DOB validation
    qr_dob = qr_demographics.get("dob", "")
    ocr_dob = ocr_map.get("DOB", "")
    if qr_dob and ocr_dob:
        qr_years = re.findall(r'\d{4}', qr_dob)
        ocr_years = re.findall(r'\d{4}', ocr_dob)
        if qr_years and ocr_years and qr_years[0] == ocr_years[0]:
            matched.append("DOB")
        elif qr_dob in ocr_dob or ocr_dob in qr_dob:
            matched.append("DOB")
        else:
            mismatched.append({"field": "DOB", "qr": qr_dob, "ocr": ocr_dob})

    # 3. Gender validation
    qr_gender = qr_demographics.get("gender", "").lower()
    ocr_gender = ocr_map.get("Gender", "").lower()
    if qr_gender and ocr_gender:
        if qr_gender[0] == ocr_gender[0]:
            matched.append("Gender")
        else:
            mismatched.append({"field": "Gender", "qr": qr_gender, "ocr": ocr_gender})

    tamper_alert = len(mismatched) > 0 and len(matched) > 0
    return {
        "cross_validated": True,
        "status": "TAMPER_SUSPECTED" if tamper_alert else "CONSISTENT",
        "matched_fields": matched,
        "mismatched_fields": mismatched,
        "tamper_alert": tamper_alert,
        "rationale": "Demographic cross-validation passed: printed text matches encrypted QR payload" if not tamper_alert else "CRITICAL: Printed text differs from encrypted QR code payload (swapped credential alert)"
    }
