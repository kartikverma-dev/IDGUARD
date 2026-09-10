import urllib.request
import urllib.error
import json
import os
import io
import cv2
import numpy as np
import time

BASE_URL = "http://localhost:8000"

def create_multipart_formdata(fields, files):
    boundary = "----WebKitFormBoundaryIDGUARD" + str(int(time.time() * 1000))
    body = io.BytesIO()
    
    for key, value in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode())
        body.write(f"{value}\r\n".encode())
        
    for key, (filename, content, content_type) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.write(content)
        body.write(b"\r\n")
        
    body.write(f"--{boundary}--\r\n".encode())
    return boundary, body.getvalue()

def post_form(endpoint, files, fields=None):
    if fields is None:
        fields = {}
    boundary, data = create_multipart_formdata(fields, files)
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode())
        except Exception:
            err_data = {"detail": str(e)}
        return e.code, err_data

def get_json(endpoint):
    try:
        with urllib.request.urlopen(f"{BASE_URL}{endpoint}") as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def run_tests():
    print("=================================================================")
    print(" IDGUARD FULL SYSTEM QA & COMPLIANCE VERIFICATION SUITE")
    print("=================================================================\n")

    # 1. Health Endpoint Test
    status, health_resp = get_json("/api/health")
    print(f"[TEST 1] System Health Status: HTTP {status}")
    print(f"         Overall Status: {health_resp.get('status')}, Version: {health_resp.get('version')}")
    print(f"         Modules: {health_resp.get('modules')}\n")
    assert status == 200
    assert health_resp.get("modules", {}).get("yolo_detector") == "online"
    assert health_resp.get("modules", {}).get("face_verification") == "online"

    # Test Image Paths
    doc_path_kannada = r"C:\Users\sures\.gemini\antigravity\brain\09a333d0-f260-4f84-a784-f1fd33b41068\.user_uploaded\media_1788882396068.jpg"
    doc_path_b = r"E:\SIH\AADHAAR_DETECTION_2\test\images\10021_jpg.rf.4ff31dd77a5c6696669566276a29666f.jpg"
    
    with open(doc_path_kannada, "rb") as f:
        doc_bytes_kannada = f.read()
    with open(doc_path_b, "rb") as f:
        doc_bytes_b = f.read()

    # Create Same Person Selfie (Cropped from doc_path_kannada around face [70, 107, 153, 195])
    img_k = cv2.imread(doc_path_kannada)
    same_selfie_crop = img_k[80:220, 50:175]
    _, same_selfie_bytes = cv2.imencode(".jpg", same_selfie_crop)
    same_selfie_bytes = same_selfie_bytes.tobytes()

    # Create Different Person Selfie (Cropped from doc_path_b around face [115, 389, 197, 481])
    img_b = cv2.imread(doc_path_b)
    diff_selfie_crop = img_b[360:500, 100:220]
    _, diff_selfie_bytes = cv2.imencode(".jpg", diff_selfie_crop)
    diff_selfie_bytes = diff_selfie_bytes.tobytes()

    # Blank image (No face)
    blank_img = np.zeros((200, 200, 3), dtype=np.uint8)
    _, blank_bytes = cv2.imencode(".jpg", blank_img)
    blank_bytes = blank_bytes.tobytes()

    # 2. TEST A: Valid Kannada/English Aadhaar Document Verification
    t0 = time.time()
    code, res_k = post_form("/api/verification/document", {
        "file": ("kannada_aadhaar.jpg", doc_bytes_kannada, "image/jpeg")
    })
    elapsed_k = round((time.time() - t0) * 1000, 2)
    print(f"[TEST 2] Document Verification (Kannada Aadhaar): HTTP {code} in {elapsed_k} ms")
    print(f"         Verification ID: {res_k.get('verification_id')}")
    print(f"         Status: {res_k.get('status')}")
    print(f"         Detected Fields: {[f['field'] for f in res_k.get('fields', [])]}")
    print(f"         OCR Fields: {[f['field'] + ': ' + f['text'] for f in res_k.get('ocr', {}).get('fields', [])]}")
    print(f"         Timing Breakdown: {res_k.get('timing_breakdown')}\n")
    assert code == 200
    assert res_k.get("status") == "document_detected"
    assert any("XXXX" in f["text"] for f in res_k.get("ocr", {}).get("fields", []) if f["field"] == "Aadhaar_Number")

    # 3. TEST B: 1:1 Face Match (SAME PERSON)
    code, res_same = post_form("/api/verification/face-match", {
        "document_image": ("doc.jpg", doc_bytes_kannada, "image/jpeg"),
        "selfie_image": ("selfie_same.jpg", same_selfie_bytes, "image/jpeg")
    })
    print(f"[TEST 3] 1:1 Face Match (SAME PERSON): HTTP {code}")
    print(f"         Similarity: {res_same.get('similarity') * 100:.1f}%")
    print(f"         Decision: {res_same.get('result')}")
    print(f"         Model: {res_same.get('model')}")
    print(f"         Processing Time: {res_same.get('processing_time_ms')} ms\n")
    assert code == 200
    assert res_same.get("result") == "MATCH"
    assert res_same.get("similarity") > 0.80

    # 4. TEST C: 1:1 Face Match (DIFFERENT PERSON)
    code, res_diff = post_form("/api/verification/face-match", {
        "document_image": ("doc.jpg", doc_bytes_kannada, "image/jpeg"),
        "selfie_image": ("selfie_diff.jpg", diff_selfie_bytes, "image/jpeg")
    })
    print(f"[TEST 4] 1:1 Face Match (DIFFERENT PERSON): HTTP {code}")
    print(f"         Similarity: {res_diff.get('similarity') * 100:.1f}%")
    print(f"         Decision: {res_diff.get('result')}")
    print(f"         Processing Time: {res_diff.get('processing_time_ms')} ms\n")
    assert code == 200
    assert res_diff.get("result") == "NO_MATCH"
    assert res_diff.get("similarity") < 0.20

    # 5. TEST D: 1:1 Face Match (NO FACE IN SELFIE)
    code, res_noface = post_form("/api/verification/face-match", {
        "document_image": ("doc.jpg", doc_bytes_kannada, "image/jpeg"),
        "selfie_image": ("blank.jpg", blank_bytes, "image/jpeg")
    })
    print(f"[TEST 5] 1:1 Face Match (NO FACE IN SELFIE): HTTP {code}")
    print(f"         Decision: {res_noface.get('result')}")
    print(f"         Doc Face Detected: {res_noface.get('document_face_detected')}")
    print(f"         Selfie Face Detected: {res_noface.get('selfie_face_detected')}\n")
    assert code == 200
    assert res_noface.get("result") == "SELFIE_FACE_NOT_DETECTED"

    # 6. TEST E: Unified Full-Pipeline Verification (Document + Selfie in 1 request)
    code, res_unified = post_form("/api/verification/document", {
        "file": ("doc.jpg", doc_bytes_kannada, "image/jpeg"),
        "selfie": ("selfie.jpg", same_selfie_bytes, "image/jpeg")
    })
    print(f"[TEST 6] Unified Document + Face Pipeline: HTTP {code}")
    print(f"         Verification ID: {res_unified.get('verification_id')}")
    print(f"         Document Status: {res_unified.get('status')}")
    print(f"         Face Decision: {res_unified.get('face_verification', {}).get('result')}")
    print(f"         Face Similarity: {res_unified.get('face_verification', {}).get('similarity') * 100:.1f}%")
    print(f"         Timing Breakdown: {res_unified.get('timing_breakdown')}\n")
    assert code == 200
    assert res_unified.get("face_verification", {}).get("result") == "MATCH"

    # 7. TEST F: Security & Validation - Empty File Upload
    code, res_empty = post_form("/api/verification/document", {
        "file": ("empty.jpg", b"", "image/jpeg")
    })
    print(f"[TEST 7] Security: Empty File Upload Rejection: HTTP {code}")
    print(f"         Detail: {res_empty.get('detail')}\n")
    assert code == 400

    # 8. TEST G: Security & Validation - Unsupported MIME-Type (text/plain)
    code, res_txt = post_form("/api/verification/document", {
        "file": ("malicious.txt", b"Random text data", "text/plain")
    })
    print(f"[TEST 8] Security: Non-image Upload Rejection: HTTP {code}")
    print(f"         Detail: {res_txt.get('detail')}\n")
    assert code == 400

    # 9. TEST H: Security & Validation - Oversized Upload (>15MB)
    fake_huge = b"A" * (16 * 1024 * 1024)
    code, res_huge = post_form("/api/verification/document", {
        "file": ("huge.jpg", fake_huge, "image/jpeg")
    })
    print(f"[TEST 9] Security: Oversized Upload (16MB) DoS Guard: HTTP {code}")
    print(f"         Detail: {res_huge.get('detail')}\n")
    assert code == 413

    # 10. TEST I: Session Retrieval by ID
    ver_id = res_unified.get("verification_id")
    code, res_retrieved = get_json(f"/api/verification/{ver_id}")
    print(f"[TEST 10] Session Retrieval for {ver_id}: HTTP {code}")
    print(f"          Status: {res_retrieved.get('status')}")
    print(f"          Retrieved Fields: {len(res_retrieved.get('fields', []))}\n")
    assert code == 200
    assert res_retrieved.get("verification_id") == ver_id

    # 11. TEST J: Non-existent Verification ID Query
    code, res_404 = get_json("/api/verification/VER-2026-NONEXISTENT")
    print(f"[TEST 11] Error Handling: Non-existent Session Query: HTTP {code}")
    print(f"          Detail: {res_404.get('detail')}\n")
    assert code == 404

    # 12. TEST K: History Records List
    code, res_history = get_json("/api/verifications")
    print(f"[TEST 12] Audit History List: HTTP {code}")
    print(f"          Total Sessions Stored: {len(res_history)}\n")
    assert code == 200
    assert len(res_history) >= 2

    # 13. TEST L: Live Computed Analytics
    code, res_analytics = get_json("/api/analytics")
    print(f"[TEST 13] Real-time Analytics Endpoint: HTTP {code}")
    print(f"          Total Verifications: {res_analytics.get('total_verifications')}")
    print(f"          Successful: {res_analytics.get('successful')}")
    print(f"          Manual Review: {res_analytics.get('manual_review')}")
    print(f"          Average Latency: {res_analytics.get('avg_processing_time')} ms\n")
    assert code == 200
    assert res_analytics.get("total_verifications") >= 2

    print("=================================================================")
    print(" ALL 13 END-TO-END QA AUDIT TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
