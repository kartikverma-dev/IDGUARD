import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

import cv2
import numpy as np
from paddleocr import PaddleOCR

print("Initializing PaddleOCR...")
ocr = PaddleOCR(lang='en')

img = np.zeros((100, 300, 3), dtype=np.uint8)
cv2.putText(img, '1234 5678 9012', (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

print("Running inference with __call__...")
try:
    res = ocr(img)
    print("Inference success with __call__!")
    print(res)
except Exception as e:
    print("Exception using __call__:", e)
    print("Trying ocr.ocr()...")
    try:
        res = ocr.ocr(img)
        print("Inference success with ocr.ocr!")
    except Exception as e2:
        print("Exception using ocr.ocr:", e2)

