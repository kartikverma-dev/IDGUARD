import cv2
import numpy as np
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders 4 points in clockwise order: top-left, top-right, bottom-right, bottom-left.
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def auto_rectify_document(image_bytes: bytes) -> Tuple[bytes, bool]:
    """
    Scans for an angled document card contour in the image.
    If a quadrilateral card is found on a background surface,
    it applies a 4-point homography perspective warp to un-skew and flatten it.
    If already tight-cropped or no clean contour is detected, returns original bytes.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes, False

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.bilateralFilter(gray, 9, 75, 75)
        edged = cv2.Canny(blurred, 30, 150)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(edged, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

        card_cnt = None
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                # Must be at least 25% of total image and less than 95% (to avoid whole frame boundary)
                if (h * w * 0.25) < area < (h * w * 0.96):
                    card_cnt = approx
                    break

        if card_cnt is not None:
            pts = card_cnt.reshape(4, 2)
            rect = order_points(pts)
            (tl, tr, br, bl) = rect

            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))

            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))

            aspect = maxWidth / (maxHeight + 1e-5)
            # Standard ID card aspect ratio is ~1.58 (acceptable 1.2 to 2.0)
            if 1.20 <= aspect <= 2.05 and maxWidth > 200 and maxHeight > 150:
                dst = np.array([
                    [0, 0],
                    [maxWidth - 1, 0],
                    [maxWidth - 1, maxHeight - 1],
                    [0, maxHeight - 1]
                ], dtype="float32")

                M = cv2.getPerspectiveTransform(rect, dst)
                warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

                # Encode back to JPEG
                _, encimg = cv2.imencode(".jpg", warped, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
                return encimg.tobytes(), True

    except Exception as e:
        logger.warning(f"Perspective rectification fallback triggered: {e}")

    return image_bytes, False
