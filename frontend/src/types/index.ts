export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectedField {
  field: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface ModelInfo {
  name: string;
  version: string;
}

export interface ModuleStatus {
  status: string;
}

export interface OCRValidation {
  status: string;
}

export interface OCRField {
  field: string;
  text: string;
  ocr_confidence: number;
  validation: OCRValidation;
}

export interface OCRModuleStatus {
  status: string;
  engine: string;
  fields: OCRField[];
}

export interface FaceVerificationStatus {
  status: string;
  document_face_detected?: boolean;
  selfie_face_detected?: boolean;
  similarity?: number;
  result?: 'MATCH' | 'NO_MATCH' | 'REVIEW' | string;
  model?: string;
  processing_time_ms?: number;
  multiple_faces_detected?: boolean;
  threshold?: number;
  threshold_type?: string;
}

export interface LivenessChecks {
  sharpness?: string;
  glare_artifact?: string;
  chroma_distribution?: string;
  moire_interference?: string;
}

export interface LivenessModuleStatus {
  status: string;
  score?: number;
  result?: 'GENUINE_LIVE' | 'SUSPICIOUS_QUALITY' | 'SPOOF_DETECTED' | string;
  model?: string;
  processing_time_ms?: number;
  checks?: LivenessChecks;
  error?: string;
}

export interface TimingBreakdown {
  document_detection_ms?: number;
  ocr_ms?: number;
  face_verification_ms?: number;
  liveness_ms?: number;
  forgery_detection_ms?: number;
  risk_engine_ms?: number;
  total_ms?: number;
}

export interface ForgeryChecks {
  ai_provenance?: {
    has_exif?: boolean;
    ai_signature_detected?: boolean;
    software_name?: string | null;
    signatures_found?: string[];
    note?: string;
  };
  watermark_audit?: {
    watermark_detected?: boolean;
    keywords?: string[];
    note?: string;
  };
  qr_code_audit?: {
    qr_detected?: boolean;
    is_pseudo?: boolean;
    status?: string;
    edge_density?: number;
    gradient_mean?: number;
  };
  verhoeff_checksum?: {
    has_aadhaar_number?: boolean;
    verhoeff_valid?: boolean | null;
    note?: string;
  };
  metadata_audit?: {
    has_exif?: boolean;
    editing_software_detected?: boolean;
    software_name?: string | null;
    note?: string;
  };
  error_level_analysis?: {
    passed?: boolean;
    mean_error?: number;
    max_error?: number;
    std_error?: number;
    splicing_ratio?: number;
    splicing_detected?: boolean;
    tamper_score?: number;
  };
  frequency_spectral?: {
    passed?: boolean;
    high_freq_ratio?: number;
    spectral_anomaly?: boolean;
  };
}

export interface ForgeryModuleStatus {
  status: string;
  verdict?: 'AUTHENTIC' | 'SUSPICIOUS_EDIT' | 'FORGERY_DETECTED' | 'SUSPECTED_SPAM_OR_AI' | string;
  tamper_score?: number;
  is_authentic?: boolean;
  is_synthetic_or_spam?: boolean;
  warm_warning?: string | null;
  indicators?: string[];
  heatmap_base64?: string | null;
  processing_time_ms?: number;
  checks?: ForgeryChecks;
}

export interface RiskSignals {
  ocr_trust?: number;
  forgery_trust?: number;
  biometric_trust?: number | null;
  liveness_trust?: number | null;
}

export interface RiskModuleStatus {
  status: string;
  trust_score?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  auto_approved?: boolean;
  escalate_to_review?: boolean;
  is_synthetic_or_spam?: boolean;
  warm_warning?: string | null;
  flags?: string[];
  signals?: RiskSignals;
  decision_rationale?: string;
}

export interface QRValidationResult {
  cross_validated?: boolean;
  status?: string;
  matched_fields?: string[];
  mismatched_fields?: any[];
  tamper_alert?: boolean;
  rationale?: string;
}

export interface VerificationResponse {
  verification_id: string;
  document_type: string;
  status: string;
  model: ModelInfo;
  fields: DetectedField[];
  ocr: OCRModuleStatus;
  face_verification: FaceVerificationStatus;
  liveness: LivenessModuleStatus;
  forgery: ForgeryModuleStatus;
  risk: RiskModuleStatus;
  processing_time_ms: number;
  timing_breakdown?: TimingBreakdown;
  document_image_url?: string;
  selfie_image_url?: string;
  perspective_rectified?: boolean;
  qr_validation?: QRValidationResult;
}
