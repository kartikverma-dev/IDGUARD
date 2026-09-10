from ultralytics import YOLO
import cv2
import sys

# Class ID mapping from the service
CLASS_MAP = {
    0: "Aadhaar_Number",
    1: "DOB",
    2: "Gender",
    3: "Name",
    4: "Address"
}

# Image path from the user upload
img_path = r"C:/Users/sures/.gemini/antigravity/brain/09a333d0-f260-4f84-a784-f1fd33b41068/.user_uploaded/media_1788882396068.jpg"
model_path = r"e:/SIH/SIH2026/backend/models/document_detector/best.pt"

print("Loading YOLO model...")
model = YOLO(model_path)

print(f"Running inference on {img_path} with conf=0.10...")
results = model(img_path, conf=0.10)

print("--- DIAGNOSTIC RESULTS ---")
for r in results:
    boxes = r.boxes
    for box in boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        xyxy = box.xyxy[0].tolist()
        
        field_name = CLASS_MAP.get(cls_id, "Unknown")
        print(f"Class: {field_name} (ID: {cls_id}) | Confidence: {conf:.4f} | BBox: [x1: {xyxy[0]:.1f}, y1: {xyxy[1]:.1f}, x2: {xyxy[2]:.1f}, y2: {xyxy[3]:.1f}]")

print("--- END DIAGNOSTIC ---")
