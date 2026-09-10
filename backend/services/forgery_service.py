import io
import time
import logging
import re
import base64
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# Known digital editing / synthetic generation keywords in metadata & binary chunks
SUSPICIOUS_AI_SIGNATURES = [
    "c2pa", "synthid", "adobe firefly", "firefly", "midjourney", 
    "dall-e", "dalle", "stable diffusion", "stablediffusion", "stability.ai", 
    "bing image creator", "canva", "photopea", "picsart", "fotor", 
    "deepfake", "faceswap", "wepik", "freepik", "desygner", "photoshop", 
    "gimp", "snapseed", "paint.net", "coreldraw", "pixelmator"
]

# Watermark & dummy template keywords in OCR text
WATERMARK_KEYWORDS = [
    "SAMPLE", "SPECIMEN", "DUMMY", "TEST", "FAKE", "DEMO", 
    "PREVIEW", "TEMPLATE", "STOCK", "COPY", "VOID", "PHOTOPEA", 
    "CANVA", "WATERMARK", "DRAFT", "SHUTTERSTOCK", "GETTY", 
    "ALAMY", "DEPOSITPHOTOS", "ISTOCK", "MOCKUP", "GENERATOR", 
    "NOT FOR OFFICIAL USE", "FOR PRACTICE ONLY", "DEMONSTRATION"
]

# Dihedral group D5 multiplication and permutation tables for official UIDAI Verhoeff checksum
VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 6, 7, 8, 9, 0, 1, 2, 3, 4],
    [6, 7, 8, 9, 5, 1, 2, 3, 4, 0],
    [7, 8, 9, 5, 6, 2, 3, 4, 0, 1],
    [8, 9, 5, 6, 7, 3, 4, 0, 1, 2],
    [9, 5, 6, 7, 8, 4, 0, 1, 2, 3]
]
VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

def validate_verhoeff(num_str: str) -> bool:
    """
    Validates a 12-digit Aadhaar number against the official Dihedral group D5 algorithm.
    """
    digits = [int(n) for n in reversed(num_str) if n.isdigit()]
    if len(digits) != 12:
        return False
    c = 0
    for i in range(len(digits)):
        c = VERHOEFF_D[c][VERHOEFF_P[(i % 8)][digits[i]]]
    return c == 0

def get_status():
    return {
        "status": "online",
        "version": "2.2.0",
        "methods": [
            "AI_Watermark_Fingerprint_Detection",
            "Template_Keyword_Watermark_Audit",
            "UIDAI_Verhoeff_Checksum_D5",
            "Pseudo_Dummy_QR_Inspection",
            "Error_Level_Analysis_ELA",
            "2D_FFT_Spectral_Analysis",
            "EXIF_Container_Forensics"
        ]
    }

def detect_ai_provenance(image_bytes: bytes) -> Dict[str, Any]:
    """
    Scans raw binary streams and EXIF/XMP containers for AI generators (C2PA, SynthID, Firefly, Midjourney, DALL-E, etc.).
    """
    raw_lower = image_bytes.lower()
    signatures_found = []

    for sig in SUSPICIOUS_AI_SIGNATURES:
        if sig.encode("utf-8") in raw_lower:
            signatures_found.append(sig)

    software_name = None
    has_exif = False
    camera_make = None
    camera_model = None

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        exif_raw = pil_img._getexif()
        if exif_raw:
            has_exif = True
            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                if tag_name in ("Software", "ProcessingSoftware", "CreatorTool"):
                    software_name = str(value)
                    for sig in SUSPICIOUS_AI_SIGNATURES:
                        if sig in software_name.lower() and sig not in signatures_found:
                            signatures_found.append(sig)
                elif tag_name == "Make":
                    camera_make = str(value)
                elif tag_name == "Model":
                    camera_model = str(value)
    except Exception as e:
        logger.debug(f"EXIF parsing notice: {e}")

    signatures_found = list(set(signatures_found))
    ai_detected = len(signatures_found) > 0

    return {
        "has_exif": has_exif,
        "ai_signature_detected": ai_detected,
        "software_name": software_name,
        "camera_make": camera_make,
        "camera_model": camera_model,
        "signatures_found": signatures_found,
        "note": f"AI/Editor signatures detected: {', '.join(signatures_found)}" if ai_detected else "No known synthetic generative watermark found in container"
    }

def detect_watermark_keywords(ocr_texts: Optional[List[str]]) -> Dict[str, Any]:
    """
    Scans OCR extracted tokens across the document canvas for template watermarks (SAMPLE, SPECIMEN, DUMMY, etc.).
    """
    found_keywords = []
    if ocr_texts:
        for t in ocr_texts:
            t_upper = t.upper()
            for kw in WATERMARK_KEYWORDS:
                if kw in t_upper:
                    found_keywords.append(kw)

    found_keywords = list(set(found_keywords))
    detected = len(found_keywords) > 0
    return {
        "watermark_detected": detected,
        "keywords": found_keywords,
        "note": f"Document template watermark detected: {', '.join(found_keywords)}" if detected else "No watermark or sample text patterns identified"
    }

def detect_pseudo_qr(img: np.ndarray) -> Dict[str, Any]:
    """
    Scans for authentic QR patterns vs dummy simulated noise patches commonly pasted
    on online fake Aadhaar templates.
    """
    if img is None:
        return {"qr_detected": False, "is_pseudo": False, "status": "NO_IMAGE"}

    h, w = img.shape[:2]
    det = cv2.QRCodeDetector()

    # 1. Full image scan
    ok, _ = det.detect(img)
    if ok:
        return {"qr_detected": True, "is_pseudo": False, "status": "AUTHENTIC_QR"}

    # 2. Targeted candidate crops in typical Aadhaar QR quadrants
    crops = [
        ("top_right", img[int(0.18*h):int(0.50*h), int(0.65*w):int(0.98*w)]),
        ("bottom_right", img[int(0.40*h):int(0.90*h), int(0.60*w):int(0.98*w)]),
        ("right_half", img[:, int(0.55*w):w])
    ]
    for zone_name, crop in crops:
        if crop.size > 0:
            ok_crop, _ = det.detect(crop)
            if ok_crop:
                return {"qr_detected": True, "is_pseudo": False, "status": "AUTHENTIC_QR", "zone": zone_name}

    # 3. Check for high-density matrix noise without standard QR finder patterns
    right_roi = img[:, int(0.55*w):w]
    gray_roi = cv2.cvtColor(right_roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray_roi, 50, 150)
    edge_ratio = float(np.sum(edges > 0) / (edges.shape[0] * edges.shape[1] + 1e-5))
    gx = cv2.Sobel(gray_roi, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_roi, cv2.CV_64F, 0, 1, ksize=3)
    g_mean = float(np.mean(np.sqrt(gx**2 + gy**2)))

    # High gradient & edge density in QR area without valid QR pattern = dummy simulated QR
    is_pseudo = bool(edge_ratio > 0.045 and g_mean > 25.0)

    return {
        "qr_detected": False,
        "is_pseudo": is_pseudo,
        "status": "DUMMY_PSEUDO_QR" if is_pseudo else "NO_QR_ZONE",
        "edge_density": round(edge_ratio, 3),
        "gradient_mean": round(g_mean, 2)
    }

def audit_verhoeff_checksum(ocr_texts: Optional[List[str]], detected_fields: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Audits 12-digit Aadhaar number candidates using the official Dihedral D5 Verhoeff checksum.
    """
    candidates = []
    if detected_fields:
        for f in detected_fields:
            if f.get("field") == "Aadhaar_Number":
                t = f.get("text", "")
                digits = re.sub(r'\D', '', t)
                if len(digits) == 12:
                    candidates.append(digits)
    if ocr_texts:
        for t in ocr_texts:
            digits = re.sub(r'\D', '', t)
            if len(digits) == 12 and digits not in candidates:
                candidates.append(digits)

    if not candidates:
        return {
            "has_aadhaar_number": False,
            "verhoeff_valid": None,
            "candidate_count": 0,
            "note": "No 12-digit number found for Verhoeff check"
        }

    validations = [validate_verhoeff(c) for c in candidates]
    is_valid = any(validations)

    return {
        "has_aadhaar_number": True,
        "candidate_count": len(candidates),
        "verhoeff_valid": is_valid,
        "note": "Aadhaar Verhoeff checksum passed" if is_valid else "Aadhaar 12-digit number failed Verhoeff checksum (indicates non-UIDAI simulated number)"
    }

def analyze_ela(image_bytes: bytes, quality: int = 90) -> Dict[str, Any]:
    """
    Error Level Analysis (ELA): Detects pixel-level compression rate disparities
    caused by text splicing, swapped photos, or multi-generation re-saving.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        orig_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if orig_img is None:
            return {"passed": True, "tamper_score": 0.0, "splicing_detected": False}

        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, encimg = cv2.imencode('.jpg', orig_img, encode_param)
        recomp_img = cv2.imdecode(encimg, cv2.IMREAD_COLOR)

        diff = cv2.absdiff(orig_img, recomp_img).astype(np.float32)
        ela_map = diff * 15.0
        ela_gray = cv2.cvtColor(ela_map.clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)

        mean_error = float(np.mean(ela_gray))
        max_error = float(np.max(ela_gray))
        std_error = float(np.std(ela_gray))

        h, w = ela_gray.shape
        tile_size = max(16, min(h // 10, w // 10))
        tile_means = []

        for y in range(0, h - tile_size, tile_size):
            for x in range(0, w - tile_size, tile_size):
                patch = ela_gray[y:y+tile_size, x:x+tile_size]
                tile_means.append(np.mean(patch))

        if len(tile_means) > 0:
            median_tile = np.median(tile_means)
            p95_tile = np.percentile(tile_means, 95)
            splicing_ratio = float(p95_tile / (median_tile + 1e-5))
            splicing_detected = bool(splicing_ratio > 3.8 and max_error > 120.0)
        else:
            splicing_ratio = 1.0
            splicing_detected = False

        tamper_score = 0.0
        if splicing_detected:
            tamper_score += 0.50
        tamper_score += min(0.50, (std_error / 50.0) * 0.3 + (mean_error / 40.0) * 0.2)
        tamper_score = round(min(1.0, max(0.0, tamper_score)), 3)

        # Generate visual heatmap for interactive auditor inspection
        heatmap_base64 = None
        try:
            ela_norm = cv2.normalize(ela_gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
            heatmap = cv2.applyColorMap(ela_norm, cv2.COLORMAP_INFERNO)
            _, heat_enc = cv2.imencode(".jpg", heatmap, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            heatmap_base64 = f"data:image/jpeg;base64,{base64.b64encode(heat_enc).decode('utf-8')}"
        except Exception as e_map:
            logger.debug(f"Failed to generate ELA heatmap: {e_map}")

        return {
            "passed": not splicing_detected,
            "mean_error": round(mean_error, 2),
            "max_error": round(max_error, 2),
            "std_error": round(std_error, 2),
            "splicing_ratio": round(splicing_ratio, 2),
            "splicing_detected": splicing_detected,
            "tamper_score": tamper_score,
            "heatmap_base64": heatmap_base64
        }
    except Exception as e:
        logger.error(f"ELA analysis failed: {e}")
        return {"passed": True, "tamper_score": 0.0, "splicing_detected": False, "heatmap_base64": None}

def analyze_frequency_spectral(image_bytes: bytes) -> Dict[str, Any]:
    """
    2D Fast Fourier Transform (FFT) high-frequency grid & periodic artifact check.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return {"passed": True, "high_freq_ratio": 0.8, "spectral_anomaly": False}

        img_resized = cv2.resize(img, (256, 256)).astype(np.float32)
        f = np.fft.fft2(img_resized)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-5)

        h, w = magnitude_spectrum.shape
        cy, cx = h // 2, w // 2
        radius = 40
        y, x = np.ogrid[:h, :w]
        mask = ((x - cx)**2 + (y - cy)**2) > radius**2

        high_freq_energy = float(np.mean(magnitude_spectrum[mask]))
        total_energy = float(np.mean(magnitude_spectrum))
        ratio = round(high_freq_energy / (total_energy + 1e-5), 3)

        anomaly = bool(ratio < 0.50 or ratio > 1.35)
        return {
            "passed": not anomaly,
            "high_freq_ratio": ratio,
            "spectral_anomaly": anomaly
        }
    except Exception as e:
        logger.error(f"Spectral analysis failed: {e}")
        return {"passed": True, "high_freq_ratio": 0.8, "spectral_anomaly": False}

def analyze_document_forgery(
    image_bytes: bytes,
    ocr_texts: Optional[List[str]] = None,
    detected_fields: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Multi-Layer Forensic & Provenance Triangulation:
    1. AI Watermark & Generative Tool Signatures (C2PA, SynthID, Firefly, Midjourney, etc.)
    2. Watermark & Sample Keyword Audit across OCR tokens
    3. Official UIDAI Verhoeff Checksum (Dihedral D5) Verification
    4. Pseudo / Dummy QR Code Matrix Detection
    5. Error Level Analysis (ELA) Pixel Splicing
    6. 2D FFT Fourier Spectral Anomaly Analysis
    """
    start_time = time.time()

    # Decode image for CV operations
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run component checks
    ai_res = detect_ai_provenance(image_bytes)
    watermark_res = detect_watermark_keywords(ocr_texts)
    qr_res = detect_pseudo_qr(img)
    verhoeff_res = audit_verhoeff_checksum(ocr_texts, detected_fields)
    ela_res = analyze_ela(image_bytes)
    spec_res = analyze_frequency_spectral(image_bytes)

    # Collect forensic indicators
    indicators = []
    is_synthetic_or_spam = False

    # 1. AI or editor provenance
    if ai_res.get("ai_signature_detected"):
        is_synthetic_or_spam = True
        sigs = ", ".join(ai_res.get("signatures_found", []))
        indicators.append(f"AI / Graphic Editor footprint detected: {sigs}")

    # 2. Watermark / template keywords
    if watermark_res.get("watermark_detected"):
        is_synthetic_or_spam = True
        kws = ", ".join(watermark_res.get("keywords", []))
        indicators.append(f"Template watermark keyword found: '{kws}'")

    # 3. Pseudo / dummy QR code on Aadhaar
    if qr_res.get("is_pseudo"):
        is_synthetic_or_spam = True
        indicators.append("Simulated 2D Barcode / Dummy QR Pattern (lacks UIDAI cryptographic structure)")

    # 4. Verhoeff checksum check
    if verhoeff_res.get("has_aadhaar_number") and verhoeff_res.get("verhoeff_valid") is False:
        if qr_res.get("qr_detected"):
            # Authentic QR is present on the card; checksum failure is likely an OCR digit substitution or demo sample
            indicators.append("Aadhaar Checksum Advisory (Verhoeff D5 mismatch — possible OCR digit substitution)")
        else:
            # No authentic QR code detected + invalid checksum = simulated fake card
            is_synthetic_or_spam = True
            indicators.append("Aadhaar Checksum Mismatch (failed Dihedral D5 check — typical of simulated numbers)")

    # 5. Localized pixel splicing via ELA
    if ela_res.get("splicing_detected"):
        indicators.append("Pixel compression discontinuity / localized splicing detected")

    # 6. Spectral lattice anomaly
    if spec_res.get("spectral_anomaly"):
        indicators.append("Frequency domain lattice anomaly (repetitive rasterization pattern)")

    # Calculate aggregate tamper score (0.0 to 1.0)
    tamper_score = 0.0
    if is_synthetic_or_spam:
        tamper_score = 0.75
    else:
        if ela_res.get("splicing_detected"):
            tamper_score += 0.45
        else:
            tamper_score += ela_res.get("tamper_score", 0.0) * 0.4

        if spec_res.get("spectral_anomaly"):
            tamper_score += 0.15

    tamper_score = round(min(1.0, max(0.0, tamper_score)), 3)

    # Classification verdict
    if is_synthetic_or_spam:
        verdict = "SUSPECTED_SPAM_OR_AI"
    elif tamper_score >= 0.65:
        verdict = "FORGERY_DETECTED"
    elif tamper_score >= 0.35:
        verdict = "SUSPICIOUS_EDIT"
    else:
        verdict = "AUTHENTIC"

    # Warm, polite, non-confrontational warning message
    warm_warning = None
    if is_synthetic_or_spam or verdict in ("SUSPECTED_SPAM_OR_AI", "SUSPICIOUS_EDIT"):
        warm_warning = (
            "Notice: Potential Synthetic or Template ID Detected — "
            "Our multi-layer forensic engine noticed visual patterns commonly associated with "
            "online templates, sample mockups, or unverified 2D codes. To prevent false alarms "
            "while maintaining institutional security, this case has been gently routed to Manual Review "
            "for human provenance cross-verification. No adverse action is taken against the applicant."
        )

    elapsed_ms = int((time.time() - start_time) * 1000)

    return {
        "status": "online",
        "verdict": verdict,
        "tamper_score": tamper_score,
        "is_authentic": verdict == "AUTHENTIC",
        "is_synthetic_or_spam": is_synthetic_or_spam,
        "warm_warning": warm_warning,
        "indicators": indicators,
        "heatmap_base64": ela_res.get("heatmap_base64"),
        "processing_time_ms": elapsed_ms,
        "checks": {
            "ai_provenance": ai_res,
            "watermark_audit": watermark_res,
            "qr_code_audit": qr_res,
            "verhoeff_checksum": verhoeff_res,
            "error_level_analysis": ela_res,
            "frequency_spectral": spec_res
        }
    }
