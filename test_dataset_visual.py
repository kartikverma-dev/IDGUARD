import os
import random
import cv2
import numpy as np

train_dir = r"E:\SIH\AADHARCARD_MERGED\train"
images_dir = os.path.join(train_dir, "images")
labels_dir = os.path.join(train_dir, "labels")

output_dir = r"E:\SIH\diagnostic_outputs"
os.makedirs(output_dir, exist_ok=True)

# YOLO label format: class x_center y_center width height (normalized)
# Class IDs: 0: Aadhaar_Number, 1: DOB, 2: Gender, 3: Name, 4: Address

def get_images_with_class(cls_id, sample_size=10):
    matched_images = []
    labels = [f for f in os.listdir(labels_dir) if f.endswith(".txt")]
    
    # Shuffle for randomness
    random.shuffle(labels)
    
    for label_file in labels:
        if len(matched_images) >= sample_size:
            break
        
        with open(os.path.join(labels_dir, label_file), "r") as f:
            lines = f.readlines()
        
        has_class = False
        bboxes = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5:
                c = int(parts[0])
                if c == cls_id:
                    has_class = True
                bboxes.append((c, float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])))
                
        if has_class:
            img_file = label_file.replace(".txt", ".jpg")
            img_path = os.path.join(images_dir, img_file)
            if os.path.exists(img_path):
                matched_images.append((img_path, bboxes))
            else:
                # Try .png
                img_file = label_file.replace(".txt", ".png")
                img_path = os.path.join(images_dir, img_file)
                if os.path.exists(img_path):
                    matched_images.append((img_path, bboxes))
                    
    return matched_images

def draw_bboxes(img_path, bboxes, target_cls):
    img = cv2.imread(img_path)
    if img is None:
        return np.zeros((400, 400, 3), dtype=np.uint8)
        
    h, w = img.shape[:2]
    
    for bbox in bboxes:
        cls_id, x_c, y_c, bw, bh = bbox
        
        if cls_id != target_cls:
            continue
            
        x1 = int((x_c - bw/2) * w)
        y1 = int((y_c - bh/2) * h)
        x2 = int((x_c + bw/2) * w)
        y2 = int((y_c + bh/2) * h)
        
        color = (0, 255, 0) if cls_id == 1 else (255, 0, 0)
        label = "DOB" if cls_id == 1 else "Address"
        
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
        cv2.putText(img, label, (x1, max(10, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        
    # Resize for grid
    img = cv2.resize(img, (400, 300))
    return img

def make_grid(images, grid_size=(2, 5)):
    rows, cols = grid_size
    grid_rows = []
    
    idx = 0
    for r in range(rows):
        row_imgs = []
        for c in range(cols):
            if idx < len(images):
                row_imgs.append(images[idx])
            else:
                row_imgs.append(np.zeros((300, 400, 3), dtype=np.uint8))
            idx += 1
        grid_rows.append(np.hstack(row_imgs))
        
    return np.vstack(grid_rows)

print("Processing DOB...")
dob_data = get_images_with_class(1, 10)
dob_images = [draw_bboxes(img_path, bboxes, 1) for img_path, bboxes in dob_data]
dob_grid = make_grid(dob_images)
cv2.imwrite(os.path.join(output_dir, "dob_contact_sheet.jpg"), dob_grid)
print(f"Saved DOB contact sheet with {len(dob_data)} images.")

print("Processing Address...")
address_data = get_images_with_class(4, 10)
address_images = [draw_bboxes(img_path, bboxes, 4) for img_path, bboxes in address_data]
address_grid = make_grid(address_images)
cv2.imwrite(os.path.join(output_dir, "address_contact_sheet.jpg"), address_grid)
print(f"Saved Address contact sheet with {len(address_data)} images.")

print("Done.")
