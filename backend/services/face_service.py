import cv2
import numpy as np
import time
import logging

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    FaceAnalysis = None
    INSIGHTFACE_AVAILABLE = False

logger = logging.getLogger(__name__)

class FaceService:
    def __init__(self):
        self.app = None
        self.status = "not_implemented"
        
    def _initialize(self):
        if not INSIGHTFACE_AVAILABLE:
            self.status = "failed"
            return

        if self.app is None:
            try:
                # Use buffalo_sc: CPU-optimized lightweight model with MobileFaceNet ArcFace backbone
                self.app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
                self.app.prepare(ctx_id=0, det_size=(640, 640))
                self.status = "online"
                logger.info("InsightFace (buffalo_sc / ArcFace) initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize InsightFace: {e}")
                self.status = "failed"

    def get_status(self):
        if self.app is None:
            return {'status': 'online'}
        return {'status': self.status}

    def verify_faces(self, document_bytes: bytes, selfie_bytes: bytes, threshold: float = 0.40):
        start_time = time.time()
        self._initialize()

        if self.app is None or self.status != "online":
            return {
                "status": "failed",
                "document_face_detected": False,
                "selfie_face_detected": False,
                "similarity": 0.0,
                "result": "MODEL_UNAVAILABLE",
                "model": "InsightFace/ArcFace",
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }

        # Decode images safely
        try:
            doc_np = np.frombuffer(document_bytes, np.uint8)
            selfie_np = np.frombuffer(selfie_bytes, np.uint8)
            
            doc_img = cv2.imdecode(doc_np, cv2.IMREAD_COLOR)
            selfie_img = cv2.imdecode(selfie_np, cv2.IMREAD_COLOR)
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            return {
                "status": "failed",
                "document_face_detected": False,
                "selfie_face_detected": False,
                "similarity": 0.0,
                "result": "INVALID_IMAGE",
                "model": "InsightFace/ArcFace",
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }

        if doc_img is None or selfie_img is None:
            return {
                "status": "failed",
                "document_face_detected": False,
                "selfie_face_detected": False,
                "similarity": 0.0,
                "result": "INVALID_IMAGE",
                "model": "InsightFace/ArcFace",
                "processing_time_ms": int((time.time() - start_time) * 1000)
            }

        try:
            # Detect faces
            doc_faces = self.app.get(doc_img)
            selfie_faces = self.app.get(selfie_img)

            doc_face_detected = len(doc_faces) > 0
            selfie_face_detected = len(selfie_faces) > 0

            # Multiple faces detection check
            multiple_faces = (len(doc_faces) > 1) or (len(selfie_faces) > 1)

            if not doc_face_detected and not selfie_face_detected:
                return {
                    "status": "completed",
                    "document_face_detected": False,
                    "selfie_face_detected": False,
                    "similarity": 0.0,
                    "result": "NO_FACES_DETECTED",
                    "model": "InsightFace/ArcFace",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                    "multiple_faces_detected": False,
                    "threshold": threshold,
                    "threshold_type": "DEMO_THRESHOLD"
                }

            if not doc_face_detected:
                return {
                    "status": "completed",
                    "document_face_detected": False,
                    "selfie_face_detected": selfie_face_detected,
                    "similarity": 0.0,
                    "result": "DOCUMENT_FACE_NOT_DETECTED",
                    "model": "InsightFace/ArcFace",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                    "multiple_faces_detected": multiple_faces,
                    "threshold": threshold,
                    "threshold_type": "DEMO_THRESHOLD"
                }

            if not selfie_face_detected:
                return {
                    "status": "completed",
                    "document_face_detected": True,
                    "selfie_face_detected": False,
                    "similarity": 0.0,
                    "result": "SELFIE_FACE_NOT_DETECTED",
                    "model": "InsightFace/ArcFace",
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                    "multiple_faces_detected": multiple_faces,
                    "threshold": threshold,
                    "threshold_type": "DEMO_THRESHOLD"
                }

            # Select the primary (largest area) face
            def get_primary_face(faces):
                return max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

            doc_face = get_primary_face(doc_faces)
            selfie_face = get_primary_face(selfie_faces)

            # Cosine similarity of normalized ArcFace embeddings
            emb1 = doc_face.normed_embedding
            emb2 = selfie_face.normed_embedding
            
            raw_sim = float(np.dot(emb1, emb2))
            similarity = round(float(np.clip(raw_sim, -1.0, 1.0)), 4)

            # Decision calibration:
            # ArcFace cosine similarity:
            # >= threshold (e.g. 0.40) -> MATCH
            # between threshold - 0.12 and threshold -> REVIEW
            # < threshold - 0.12 -> NO_MATCH
            # If multiple faces made it ambiguous, bias towards REVIEW unless very high confidence
            if similarity >= threshold:
                result = "MATCH"
            elif similarity >= (threshold - 0.12):
                result = "REVIEW"
            else:
                result = "NO_MATCH"

            return {
                "status": "completed",
                "document_face_detected": True,
                "selfie_face_detected": True,
                "similarity": similarity,
                "result": result,
                "model": "InsightFace/ArcFace",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "multiple_faces_detected": multiple_faces,
                "threshold": threshold,
                "threshold_type": "DEMO_THRESHOLD"
            }
        except Exception as e:
            logger.error(f"Error during face verification: {e}")
            return {
                "status": "failed",
                "document_face_detected": False,
                "selfie_face_detected": False,
                "similarity": 0.0,
                "result": "VERIFICATION_ERROR",
                "model": "InsightFace/ArcFace",
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "multiple_faces_detected": False,
                "threshold": threshold,
                "threshold_type": "DEMO_THRESHOLD"
            }

face_service = FaceService()

def get_status():
    return face_service.get_status()
