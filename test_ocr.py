import cv2
import numpy as np
from paddleocr import PaddleOCR

print("Initializing PaddleOCR...")
ocr = PaddleOCR(use_angle_cls=True, lang='en')

img = np.zeros((100, 300, 3), dtype=np.uint8)
cv2.putText(img, '1234 5678 9012', (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

print("Running inference...")
try:
    res = ocr.ocr(img, cls=True)
    print("Inference success!")
    print(res)
except Exception as e:
    print("Exception using ocr.ocr(img):", e)
