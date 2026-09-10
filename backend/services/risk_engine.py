import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

def get_status():
    return {
        "status": "online",
        "version": "2.2.0",
        "model": "MultiSignal_Weighted_Trust_Engine",
        "weights": {
            "biometric_arcface": 0.40,
            "liveness_pad": 0.25,
            "forgery_forensics": 0.20,
            "ocr_confidence": 0.15
        }
    }

def evaluate_risk(
    ocr_result: Dict[str, Any],
    face_result: Dict[str, Any],
    liveness_result: Dict[str, Any],
    forgery_result: Dict[str, Any],
    fields_detected: List[Any]
) -> Dict[str, Any]:
    """
    Synthesizes multi-module signals to compute a composite Trust Score (0-100),
    determine Risk Level (LOW, MEDIUM, HIGH), and decide whether to quarantine 
    the session into the Human Manual Review Queue with warm advisories.
    """
    signals = {}
    flags = []
    
    # 1. OCR Extraction Signal (0.0 to 1.0)
    ocr_fields = ocr_result.get("fields", [])
    if len(ocr_fields) > 0:
        avg_conf = sum(f.get("ocr_confidence", 0.0) for f in ocr_fields) / len(ocr_fields)
        ocr_score = min(1.0, max(0.0, avg_conf))
    else:
        ocr_score = 0.50 if len(fields_detected) > 0 else 0.20
        flags.append("Low OCR field extraction count")
    signals["ocr_trust"] = round(ocr_score, 3)

    # 2. Document Forgery & Provenance Signal (0.0 to 1.0, where 1.0 is completely authentic)
    tamper_score = forgery_result.get("tamper_score", 0.0)
    forgery_trust = round(max(0.0, 1.0 - tamper_score), 3)
    signals["forgery_trust"] = forgery_trust

    is_synthetic_or_spam = forgery_result.get("is_synthetic_or_spam", False)
    forgery_verdict = forgery_result.get("verdict")

    if is_synthetic_or_spam or forgery_verdict == "SUSPECTED_SPAM_OR_AI":
        flags.append("Potential digital template, AI watermark, or dummy QR pattern detected")
        for ind in forgery_result.get("indicators", []):
            if ind not in flags:
                flags.append(ind)
    elif forgery_verdict == "FORGERY_DETECTED":
        flags.append("Potential digital image tampering / splicing detected")
    elif forgery_verdict == "SUSPICIOUS_EDIT":
        flags.append("Compression or metadata inconsistency flagged for inspection")

    # 3. Biometric Match & Liveness Signals
    has_selfie = bool(face_result.get("selfie_face_detected") or face_result.get("similarity") is not None)
    
    if has_selfie:
        sim = face_result.get("similarity")
        if sim is not None:
            bio_trust = round(min(1.0, max(0.0, float(sim))), 3)
            signals["biometric_trust"] = bio_trust
            if sim < 0.40:
                flags.append(f"Biometric mismatch: similarity {round(sim * 100, 1)}% is below rejection threshold")
            elif sim < 0.70:
                flags.append(f"Borderline biometric similarity ({round(sim * 100, 1)}%): requires human cross-check")
        else:
            signals["biometric_trust"] = 0.0
            flags.append("Face detection failed on selfie or document")

        # Liveness / PAD
        pad_score = liveness_result.get("score")
        pad_verdict = liveness_result.get("result", "UNKNOWN")
        if pad_score is not None:
            live_trust = round(min(1.0, max(0.0, float(pad_score))), 3)
        else:
            live_trust = 0.90 if pad_verdict == "LIVE" else 0.30
        signals["liveness_trust"] = live_trust

        if pad_verdict == "SPOOF_SUSPECTED":
            flags.append("Passive PAD anti-spoofing triggered: screen Moire or texture anomaly")

        # Weighted calculation with selfie
        composite = (
            signals.get("biometric_trust", 0.5) * 0.40 +
            signals.get("liveness_trust", 0.5) * 0.25 +
            signals.get("forgery_trust", 0.5) * 0.20 +
            signals.get("ocr_trust", 0.5) * 0.15
        )
    else:
        # Document only calculation
        signals["biometric_trust"] = None
        signals["liveness_trust"] = None
        flags.append("Document-only session: 1:1 biometric reference selfie was not provided")
        composite = (
            signals.get("forgery_trust", 0.5) * 0.55 +
            signals.get("ocr_trust", 0.5) * 0.45
        )

    # Scale to 0-100
    trust_score = round(composite * 100, 1)

    # Determine Risk Classification & Escalation
    escalate_to_review = False
    
    # Critical escalation conditions:
    if is_synthetic_or_spam or forgery_verdict == "SUSPECTED_SPAM_OR_AI":
        escalate_to_review = True

    if has_selfie:
        sim = face_result.get("similarity")
        if sim is not None and 0.40 <= sim < 0.70:
            escalate_to_review = True
        if liveness_result.get("result") == "SPOOF_SUSPECTED":
            escalate_to_review = True

    if forgery_verdict in ("SUSPICIOUS_EDIT", "FORGERY_DETECTED"):
        escalate_to_review = True

    if trust_score < 65.0:
        escalate_to_review = True

    # Risk level categorization
    if is_synthetic_or_spam:
        # If biometric also completely failed, set HIGH, else set MEDIUM with warm warning
        if has_selfie and face_result.get("similarity") is not None and face_result.get("similarity") < 0.40:
            risk_level = "HIGH"
        else:
            risk_level = "MEDIUM"
    elif trust_score >= 75.0 and not escalate_to_review:
        risk_level = "LOW"
    elif trust_score >= 50.0 or escalate_to_review:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Forward warm advisory warning if applicable
    warm_warning = forgery_result.get("warm_warning")

    # Human-readable rationale
    if is_synthetic_or_spam:
        rationale = f"Trust Score: {trust_score}%. Routed to Manual Review: Suspected template, AI signature, or unverified 2D barcode."
    elif len(flags) == 0:
        rationale = f"All modules cleared with high confidence (Trust Score: {trust_score}%). Authentic physical document & verified biometric credentials."
    else:
        rationale = f"Trust Score: {trust_score}%. Noted: " + "; ".join(flags[:2])

    return {
        "status": "online",
        "trust_score": trust_score,
        "risk_level": risk_level,
        "auto_approved": not escalate_to_review and risk_level == "LOW",
        "escalate_to_review": escalate_to_review,
        "is_synthetic_or_spam": is_synthetic_or_spam,
        "warm_warning": warm_warning,
        "flags": flags,
        "signals": signals,
        "decision_rationale": rationale
    }
