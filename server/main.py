"""Final Count API. Serves the built client and the count endpoints on one port."""
from __future__ import annotations
import json, os, threading, time, uuid
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import agent
from scenes import SCENES
from facts import EVIDENCE, CASES

HERE = Path(__file__).parent
MEDIA = HERE / "media"
UPLOADS = HERE / "cache" / "uploads"
UPLOADS.mkdir(parents=True, exist_ok=True)
RECORDS = HERE / "records.json"
DIST = Path(os.environ.get("CLIENT_DIST", HERE.parent / "client" / "dist"))
LIVE_LIMIT = int(os.environ.get("LIVE_LIMIT", "40"))  # live model runs per process
_live = {"n": 0}
_lock = threading.Lock()

app = FastAPI(title="Final Count")
app.mount("/media", StaticFiles(directory=MEDIA), name="media")


def _scene_payload(s: dict) -> dict:
    seen = agent.read_table(MEDIA / s["image"])
    result = agent.reconcile(s["id"], seen, s["declared"], s["point"])
    return {**{k: s[k] for k in ("id", "title", "point", "credit", "declared")},
            "image": f"/media/{s['image']}", "video": f"/media/{s['video']}" if s["video"] else None,
            "seen": seen, "result": result}


@app.get("/api/scenes")
def scenes():
    return [_scene_payload(s) for s in SCENES]


class Declared(BaseModel):
    sponges: int
    needles: int
    instruments: int


class ReconcileIn(BaseModel):
    scene: str
    declared: Declared


def _spend():
    with _lock:
        if _live["n"] >= LIVE_LIMIT:
            raise HTTPException(429, "Live runs are used up for now.")
        _live["n"] += 1


@app.post("/api/reconcile")
def reconcile(body: ReconcileIn):
    scene = next((s for s in SCENES if s["id"] == body.scene), None)
    upload = UPLOADS / f"{body.scene}.json"
    if scene:
        seen, point = agent.read_table(MEDIA / scene["image"]), scene["point"]
    elif upload.exists():
        seen, point = json.loads(upload.read_text()), "Closing count"
    else:
        raise HTTPException(404, "Unknown scene")
    d = body.declared.model_dump()
    if min(d.values()) < 0 or max(d.values()) > 200:
        raise HTTPException(422, "Counts must be between 0 and 200.")
    _spend()
    try:
        return agent.reconcile(body.scene, seen, d, point)
    except SystemExit as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # model or network
        raise HTTPException(502, f"The count could not be reconciled: {e}")


@app.post("/api/read")
async def read_upload(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 6_000_000:
        raise HTTPException(413, "Image is over 6 MB.")
    ext = {"image/jpeg": "jpg", "image/png": "png"}.get(file.content_type or "")
    if not ext:
        raise HTTPException(415, "Use a JPEG or PNG photo.")
    _spend()
    sid = "u" + uuid.uuid4().hex[:8]
    path = UPLOADS / f"{sid}.{ext}"
    path.write_bytes(data)
    try:
        seen = agent.read_table(path)
    except Exception as e:
        raise HTTPException(502, f"The photo could not be read: {e}")
    (UPLOADS / f"{sid}.json").write_text(json.dumps(seen))
    declared = {"sponges": seen["sponges"], "needles": seen["needles"], "instruments": seen["instruments"]}
    return {"id": sid, "title": "Your photo", "point": "Closing count", "credit": "", "declared": declared,
            "image": f"/api/upload/{sid}.{ext}", "video": None, "seen": seen, "result": None}


@app.get("/api/upload/{name}")
def upload_file(name: str):
    p = UPLOADS / name
    if not p.exists() or p.parent != UPLOADS or p.suffix not in (".jpg", ".png"):
        raise HTTPException(404)
    return FileResponse(p)


class RecordIn(BaseModel):
    scene: str
    title: str
    point: str
    status: str
    headline: str
    lines: list[dict]
    resolution: str
    note: str = ""


@app.get("/api/records")
def records():
    return json.loads(RECORDS.read_text()) if RECORDS.exists() else []


@app.post("/api/records")
def add_record(body: RecordIn):
    rows = records()
    row = {**body.model_dump(), "id": uuid.uuid4().hex[:8], "at": time.strftime("%Y-%m-%dT%H:%M:%S")}
    rows.insert(0, row)
    RECORDS.write_text(json.dumps(rows[:200], indent=1))
    return row


@app.get("/api/evidence")
def evidence():
    return {"evidence": EVIDENCE, "cases": CASES}


@app.get("/{path:path}")
def spa(path: str):
    f = DIST / path
    if path and f.is_file() and DIST in f.resolve().parents:
        return FileResponse(f)
    return FileResponse(DIST / "index.html")
