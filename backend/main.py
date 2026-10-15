from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mock_data import get_dashboard, TURBINES
import requests

app = FastAPI(title="Wind Farm Monitor API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======原有接口，完全不变======
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/dashboard")
def dashboard():
    return get_dashboard()

@app.get("/api/turbines")
def turbines():
    return TURBINES

@app.get("/api/turbines/{turbine_id}")
def turbine_detail(turbine_id: str):
    for t in TURBINES:
        if t["id"] == turbine_id:
            return t
    return {"error": "not found"}

# ============ 新增：YOLO裂缝检测接口 ============
def request_yolo_detect(image_bytes):
    url = "http://127.0.0.1:8001/detect_crack"
    files = {"file": image_bytes}
    resp = requests.post(url, files=files)
    return resp.json()

@app.post("/api/blade_crack_detect")
async def blade_crack_detect(
    file: UploadFile = File(...),
    turbine_id: str = Form(...),
):
    img_data = await file.read()
    result = request_yolo_detect(img_data)
    if isinstance(result, dict):
        result["turbine_id"] = turbine_id
        if "crack_count" not in result and "cracks" in result:
            result["crack_count"] = len(result["cracks"])
    return result
# ===============================================

if __name__ == "__main__":
    import uvicorn
    # reload=False 避免残留子进程继续提供旧数据；改假数据后重新运行 python main.py 即可
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
