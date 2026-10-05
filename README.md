# Final Count

A second witness at the surgical closing count. Point it at a back table or instrument tray: it reads the items on the table, you enter the count the team declared, and it reconciles the two. If a class differs it says **Hold** and names the class and numbers. If the numbers match but the camera cannot see every item (stacked gauze, overlapping instruments), it says **Camera cannot vouch** rather than agreeing. Sign Out stays locked until a person records how the count was resolved, and every resolution is written to the count record.

Live: https://avzypzjia4.ap-southeast-2.awsapprunner.com

Not a medical device. It does not replace the count.

## NVIDIA Nemotron and Nebius Token Factory
- `Qwen/Qwen3.8-27B` (non-NVIDIA vision model, via Nebius Token Factory) reads each table image once and returns item counts per class plus what it cannot count. No Nemotron on Nebius Token Factory reads images, so this step only turns a picture into words.
- `nvidia/nemotron-3-super-120b-a12b` (Nemotron Super, `reasoning_effort="low"`) makes every decision: it takes the camera read and the declared count and returns `reconciled`, `hold` or `cannot_vouch`, with the per-class lines, the reason and the next action.
- Responses are cached on disk in `server/cache/`. The four demo tables load pre-computed. Live model calls happen only behind **Reconcile** (when the declared numbers change) and **Count a photo** (one vision read plus one reconcile).
- The API key stays server-side (`NEBIUS_API_KEY`).

Every model call runs on Nebius Token Factory, which is serverless and OpenAI-compatible, so one base URL and the standard OpenAI client reached every model with no GPU and no dedicated endpoint to provision. That is what let this be built and deployed quickly. Nemotron Super is the one Nemotron tier used. Other models: `Qwen/Qwen3.8-27B` for vision, on Token Factory.

## Real media
| File | Source | Licence |
|---|---|---|
| backtable.mp4, dvids.jpg | US Army, DVIDS 1005790, back-table cut, no people in frame | public domain |
| theatre.jpg | Ibrahim Achiri, Wikimedia Commons | CC BY-SA 4.0 |
| tray-rack.jpg (crop) | Wikimedia Commons, Surgical Instruments 01 | CC0 |

The declared counts on the four demo tables are scenario inputs entered at the count point; the camera counts are what the vision model read. Figures on the Evidence page and the court cases are cited in the app.

## Run
```
cd client && npm ci && npm run build
cd ../server && pip install fastapi "uvicorn[standard]" openai python-multipart
python -m uvicorn main:app --port 8010
```
Or `docker build -t final-count . && docker run -p 8080:8080 -e NEBIUS_API_KEY=... final-count`.

Stack: Python, FastAPI, React (Vite), Qwen vision and NVIDIA Nemotron on Nebius Token Factory.

Licensed under the Apache License 2.0.
