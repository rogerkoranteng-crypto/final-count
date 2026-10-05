"""Final Count agent: Qwen reads the table, Nemotron reconciles the count."""
from __future__ import annotations
import hashlib, json
from pathlib import Path
from nemotron import see, think, SUPER

HERE = Path(__file__).parent
CACHE = HERE / "cache"
CACHE.mkdir(exist_ok=True)

SEE_PROMPT = """You are looking at a surgical back table, Mayo stand or instrument tray.
Report only what is visible. Do not guess hidden items. Return JSON only:
{"sponges": <number of separate gauze squares/sponges you can distinguish>,
 "needles": <number of suture needles or needle packs visible, 0 if none>,
 "instruments": <number of separate metal instruments you can distinguish>,
 "instrument_types": [{"name": "hemostat", "count": 2}],
 "hidden_or_stacked": "<what is stacked, overlapping or out of frame and so cannot be counted reliably, or empty string>",
 "readable": {"sponges": <true only if every sponge is separate and fully in frame>, "needles": <true if needles can be counted or are clearly absent>, "instruments": <true only if every instrument is separate and fully in frame>}}"""

COUNT_POINTS = ["Before closing the cavity", "Before closing fascia", "Before skin closure", "Staff hand-over"]

SYSTEM = """You are Final Count, the second witness at a surgical closing count. You are not a
replacement for the human count and not a medical device. You receive (1) what a vision model
read from a back-table image, (2) the team's declared count. Decide:
- "reconciled": camera and declared count agree for every class AND the camera marked every class readable.
- "hold": any class differs between camera and declared count (even if that class is hard to read).
  Name the class, the two numbers and the direction (camera sees fewer = an item may be in the field or
  out of frame; camera sees more = the camera may be double-counting or the declared count is short).
- "cannot_vouch": no class differs, but at least one class is not readable (stacked, overlapping, out of
  frame), so the camera cannot confirm the numbers even though they match. Never agree when you cannot
  vouch. A class that is not readable has state "unverified" when it matches.
Be literal. Do not invent items or locations; you only know this one image.
Return JSON only:
{"status":"reconciled|hold|cannot_vouch",
 "lines":[{"item":"Sponges","camera":N,"declared":N,"state":"match|short|over|unverified"},{"item":"Needles",...},{"item":"Instruments",...}],
 "headline":"<=12 words, plain",
 "reason":"<=35 words, plain, names the class and numbers",
 "action":"<=18 words, what the team does next"}"""


def _key(*parts) -> str:
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:16]


def read_table(image: Path, force: bool = False) -> dict:
    """One vision call per image, cached by file hash."""
    k = _key(image.read_bytes().hex()[:4096], len(image.read_bytes()))
    f = CACHE / f"see-{image.stem}-{k}.json"
    if f.exists() and not force:
        return json.loads(f.read_text())
    from nemotron import _parse_json
    raw = see(image, SEE_PROMPT)
    out = _parse_json(raw)
    f.write_text(json.dumps(out, indent=1))
    return out


def reconcile(scene_id: str, seen: dict, declared: dict, point: str, force: bool = False) -> dict:
    k = _key(scene_id, json.dumps(seen, sort_keys=True), json.dumps(declared, sort_keys=True), point)
    f = CACHE / f"think-{scene_id}-{k}.json"
    if f.exists() and not force:
        return json.loads(f.read_text())
    user = json.dumps({"count_point": point, "camera_read": seen, "declared_count": declared})
    out = think([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                model=SUPER, json_out=True, reasoning_effort="low", max_tokens=6000)
    f.write_text(json.dumps(out, indent=1))
    return out
