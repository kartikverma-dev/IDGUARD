import cv2
import numpy as np
import time
import logging

logger = logging.getLogger(__name__)

class LivenessService:
    def __init__(self):
        self.model_name = "IDGUARD Passive PAD (ISO 30107-1 Level 1)"
        self.version = "v1.0"

    def get_status(self):
        return {
            "status": "online",
            "engine": self.model_name,
            "version": self.version,
            "type": "Passive Anti-Spoofing"
        }

    def analyze_liveness(self, image_bytes: bytes) -> dict:
        """
        Passive Presentation Attack Detection (PAD) analyzing single-frame selfie capture.
        Evaluates:
        1. Natural texture sharpness (Laplacian variance)
        2. High-frequency Moire / screen recapture distortion
        3. Specular reflection / glare hotspots
        4. Skin chromatic distribution (YCrCb richness)
        """
        t0 = time.time()
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "status": "failed",
                    "error": "Failed to decode selfie image",
                    "score": 0.0,
                    "result": "INVALID_IMAGE"
                }

            h, w = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # 1. Texture Sharpness Metric (Laplacian variance)
            lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            if lap_var < 50:
                sharpness_score = max(0.1, lap_var / 50.0 * 0.5)
            elif lap_var > 1500:
                sharpness_score = 0.65  # digital screen over-sharpening penalty
            else:
                sharpness_score = min(1.0, 0.7 + (lap_var / 500.0) * 0.3)

            # 2. Specular Glare / Reflection Hotspots (Glass screen or glossy print)
            glare_pixels = np.sum(gray > 250)
            glare_ratio = float(glare_pixels) / float(gray.size)
            if glare_ratio > 0.04:
                glare_score = 0.3
            elif glare_ratio > 0.015:
                glare_score = 0.6
            else:
                glare_score = 0.95

            # 3. Chrominance Richness (YCrCb color space distribution)
            ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
            cr_std = float(np.std(ycrcb[:, :, 1]))
            cb_std = float(np.std(ycrcb[:, :, 2]))
            chroma_score = min(1.0, (cr_std + cb_std) / 8.0)

            # 4. High-frequency Fourier Spectral Energy (Moire pattern detection)
            dft = np.fft.fft2(gray)
            dft_shift = np.fft.fftshift(dft)
            mag_spec = np.abs(dft_shift)
            total_energy = np.sum(mag_spec) + 1e-6
            cy, cx = h // 2, w // 2
            r = int(min(h, w) * 0.1)
            y, x = np.ogrid[:h, :w]
            high_pass_mask = ((x - cx)**2 + (y - cy)**2) > r*r
            high_energy = np.sum(mag_spec[high_pass_mask])
            hf_ratio = float(high_energy) / float(total_energy)
            moire_score = 0.9 if (0.15 <= hf_ratio <= 0.85) else 0.5

            # Composite Liveness Score
            composite_score = round(
                (sharpness_score * 0.35) +
                (glare_score * 0.25) +
                (chroma_score * 0.25) +
                (moire_score * 0.15),
                4
            )

            # Decision calibration
            if composite_score >= 0.70:
                result = "GENUINE_LIVE"
            elif composite_score >= 0.50:
                result = "SUSPICIOUS_QUALITY"
            else:
                result = "SPOOF_DETECTED"

            elapsed_ms = int((time.time() - t0) * 1000)

            return {
                "status": "completed",
                "score": composite_score,
                "result": result,
                "model": self.model_name,
                "processing_time_ms": elapsed_ms,
                "checks": {
                    "sharpness": "pass" if sharpness_score >= 0.6 else "fail",
                    "glare_artifact": "pass" if glare_score >= 0.6 else "warn",
                    "chroma_distribution": "pass" if chroma_score >= 0.5 else "warn",
                    "moire_interference": "pass" if moire_score >= 0.6 else "warn"
                }
            }
        except Exception as e:
            logger.error(f"Liveness analysis error: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "score": 0.0,
                "result": "ERROR"
            }

liveness_service_instance = LivenessService()

def get_status():
    return liveness_service_instance.get_status()

def analyze_liveness(image_bytes: bytes) -> dict:
    return liveness_service_instance.analyze_liveness(image_bytes)

