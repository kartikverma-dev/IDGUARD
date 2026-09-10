from pydantic import BaseModel
from typing import List, Optional, Any

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class DetectedField(BaseModel):
    field: str
    confidence: float
    bbox: BoundingBox

class ModelInfo(BaseModel):
    name: str
    version: str

class ModuleStatus(BaseModel):
    status: str

class OCRValidation(BaseModel):
    status: str

class OCRField(BaseModel):
    field: str
    text: str
    raw_text: Optional[str] = None
    ocr_confidence: float
    validation: OCRValidation

class OCRModuleStatus(BaseModel):
    status: str
    engine: str = "PaddleOCR"
    fields: List[OCRField] = []
    raw_lines: Optional[List[str]] = []

class FaceVerificationStatus(BaseModel):
    status: str
    document_face_detected: Optional[bool] = None
    selfie_face_detected: Optional[bool] = None
    similarity: Optional[float] = None
    result: Optional[str] = None
    model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    multiple_faces_detected: Optional[bool] = False
    threshold: Optional[float] = 0.40
    threshold_type: Optional[str] = "DEMO_THRESHOLD"

class LivenessModuleStatus(BaseModel):
    status: str
    score: Optional[float] = None
    result: Optional[str] = None
    model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    checks: Optional[dict] = None
    error: Optional[str] = None

class ForgeryModuleStatus(BaseModel):
    status: str = "online"
    verdict: Optional[str] = "AUTHENTIC"
    tamper_score: Optional[float] = 0.0
    is_authentic: Optional[bool] = True
    is_synthetic_or_spam: Optional[bool] = False
    warm_warning: Optional[str] = None
    indicators: Optional[List[str]] = []
    heatmap_base64: Optional[str] = None
    processing_time_ms: Optional[int] = None
    checks: Optional[dict] = None

class RiskModuleStatus(BaseModel):
    status: str = "online"
    trust_score: Optional[float] = 100.0
    risk_level: Optional[str] = "LOW"
    auto_approved: Optional[bool] = True
    escalate_to_review: Optional[bool] = False
    is_synthetic_or_spam: Optional[bool] = False
    warm_warning: Optional[str] = None
    flags: Optional[List[str]] = []
    signals: Optional[dict] = None
    decision_rationale: Optional[str] = None

class VerificationResponse(BaseModel):
    verification_id: str
    document_type: str
    status: str
    model: ModelInfo
    fields: List[DetectedField]
    ocr: OCRModuleStatus
    face_verification: FaceVerificationStatus
    liveness: LivenessModuleStatus
    forgery: ForgeryModuleStatus
    risk: RiskModuleStatus
    processing_time_ms: float
    timing_breakdown: Optional[dict] = None
    document_image_url: Optional[str] = None
    selfie_image_url: Optional[str] = None
    perspective_rectified: Optional[bool] = False
    qr_validation: Optional[dict] = None


