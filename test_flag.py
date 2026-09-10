import urllib.request
import json
import time

doc_path = r"C:\Users\sures\.gemini\antigravity\brain\09a333d0-f260-4f84-a784-f1fd33b41068\.user_uploaded\media_1788882396068.jpg"
boundary = "----WebKitFormBoundaryIDGUARD123"
body = bytearray()
body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"doc.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode())
with open(doc_path, "rb") as f:
    body.extend(f.read())
body.extend(f"\r\n--{boundary}--\r\n".encode())

req = urllib.request.Request(
    "http://localhost:8000/api/verification/document", 
    data=bytes(body), 
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}, 
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode())
    ver_id = res["verification_id"]
    print(f"Created verification session: {ver_id} | Status: {res['status']}")

# Flag for manual review
flag_req = urllib.request.Request(
    f"http://localhost:8000/api/verification/{ver_id}/flag-review", 
    data=b"", 
    method="POST"
)
with urllib.request.urlopen(flag_req) as resp:
    flag_res = json.loads(resp.read().decode())
    print(f"Status after flagging: {flag_res['status']}")
    print(f"Face result: {flag_res.get('face_verification', {}).get('result')}")
    assert flag_res["status"] == "manual_review"
    print("SUCCESS: Flag for manual review verified!")
