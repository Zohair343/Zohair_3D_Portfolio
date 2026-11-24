# Playable Pages

An interactive 3D comic-book portfolio for **Muhammad Zohair Shaikh**, game developer (Karachi). Semester project: *Design and Development of an Interactive 3D Web Portfolio*.

| Module | Where |
|---|---|
| 1 · 3D comic-book portfolio | `frontend/src/book/` (engine, one file per chapter, `book.config.ts`) |
| 2 · Avatar | `frontend/src/avatar/` (config, rig, cover avatar), `assets/avatar/final/` |
| 3 · Portfolio film | `film/` (After Effects plan + animatic stand-in), `frontend/public/media/film/` |
| 4 · Ask Zohair RAG chatbot | `backend/ingest.py`, `backend/rag.py`, `content/` |
| 5 · Contact / email | `backend/contact.py`, `frontend/src/pages/Contact.tsx` |
| 6 · Deployment & docs | `Dockerfile`, `render.yaml`, `docs/` |

Status of every deliverable: **[`docs/CHECKLIST.md`](docs/CHECKLIST.md)**. Live-change guide for the viva: **[`VIVA.md`](VIVA.md)**.

## Stack (as built)

- **Frontend:** Vite 5, React 18, TypeScript, React Router 6, three.js r169 via `@react-three/fiber` + `drei`. Reading, captions, forms and navigation are semantic HTML/CSS; WebGL is used only for the avatar. Page turns are CSS 3D transforms. three.js (~244 KB gz) is lazy-loaded, so the cover works before (or without) WebGL. Fonts are self-hosted (`@fontsource`), so no third-party font requests.
- **3D book demo (`/book`):** a WebGL book whose pages bend as they turn (`frontend/src/book/`). Resting pages show live HTML aligned over the 3D page (CSS3DRenderer); turning pages show a snapshot texture of that same HTML (`modern-screenshot`).
- **Backend:** Flask 3. Ask Zohair is retrieval-augmented: Gemini embeddings (`gemini-embedding-001`) in a FAISS index plus an IDF keyword signal, answers from Gemini (`gemini-3.8-flash`, structured JSON) with server-side citation guards. Providers are switchable (`LLM_PROVIDER=anthropic`, `EMBED_PROVIDER=local`). On Vercel each endpoint is a Python function in `api/`.
- **Production:** Vercel serves `frontend/dist` and runs `api/chat.py`, `api/contact.py`, `api/health.py`. Locally, `python app.py` serves both from one origin.

## Prerequisites

Node 20+ (tested on 22), Python 3.11+ (tested on 3.13), ffmpeg (only to rebuild media), Blender 4.2 (only for avatar work).

## Run locally

```bash
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt   # + requirements-dev.txt for tests
```

```bash
cp backend/.env.example backend/.env    # then edit values
```

```bash
cd backend && . .venv/bin/activate && python ingest.py && python app.py      # API on :5000
```

```bash
cd frontend && npm install && npm run dev                                     # site on :5173, /api proxied to :5000
```

Production-style (one process serving the built site):

```bash
cd frontend && npm run build && cd ../backend && gunicorn app:app --threads 4 --bind 127.0.0.1:8000
```

## Environment variables (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key. Server-side only. Check it with `python check_gemini.py` |
| `GEMINI_FALLBACK_MODELS` | Models tried (after one retry) when the main model is busy; default `gemini-3.5-flash-lite` |
| `LLM_PROVIDER` / `GEMINI_CHAT_MODEL` | `gemini` + `gemini-3.8-flash` by default (`gemini-3.5-flash-lite` is cheaper/faster) |
| `EMBED_PROVIDER` / `GEMINI_EMBED_MODEL` / `EMBED_DIM` | `gemini` + `gemini-embedding-001` at 768 dimensions. `local` uses a keyless ONNX model (needs `requirements-dev.txt`, not for Vercel) |
| `CONTACT_TO_EMAIL` | Fixed recipient (`zohairishrat@gmail.com`); never taken from the request |
| `MAIL_FROM` / `EMAIL_PROVIDER` / `RESEND_API_KEY` | Verified sender, `resend` (recommended) or `smtp` (`SMTP_*`); `dev-log` validates without sending (blocked when `APP_ENV=production`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Shared rate limits across serverless instances. Without them, limits are per instance |
| `APP_ENV` | `production` on Vercel |
| `ANTHROPIC_API_KEY`, `CHAT_MODEL` | Only if `LLM_PROVIDER=anthropic` |

Never commit `backend/.env`; it is git-ignored.

**The search index builds itself.** `python ingest.py` writes `backend/index/` locally; if it's missing or doesn't match the current content and embedding model, the server rebuilds it on first use (one embedding call for the whole portfolio) and caches it. So after editing `content/portfolio.json`, nothing else is required for the chatbot to know the change.

## Editing content

All public text lives in **`content/portfolio.json`**. The site renders it, and `ingest.py` chunks it for the chatbot, so citations can't drift from the panels. Each panel `id` is a URL anchor (`/projects/scorched#combo`). Rules:

- Only facts from the résumé or material Zohair approves. No phone numbers or private emails (ingest also strips them).
- Add project/repository links in a project's `links: [{ "label", "url" }]`.
- Extra approved documents: drop Markdown into `content/knowledge/` (`# Title`, optional `url: /path`, one chunk per `## heading`).

After editing, **rebuild the index**:

```bash
cd backend && . .venv/bin/activate && python ingest.py && python -m pytest -q
```

The tests include a check that every chunk anchor exists in the frontend.

## Media

| Asset | Location | Rebuild |
|---|---|---|
| Cover illustrations | `frontend/public/art/*.svg` | Hand-authored; the maze one is generated from the real algorithm: `cd frontend && npx vite-node scripts/gen-maze-art.ts` |
| Gameplay clips | `frontend/public/media/dev/*-dev.{webm,mp4}` | **Development media, labelled on-frame.** `tools/make-dev-media.sh` |
| Film | `frontend/public/media/film/portfolio-animatic.*` + `.en.vtt` | Animatic: `film/animatic/build.sh`. Replace with the After Effects render at the same path |

**Adding real gameplay:** put the clip at `frontend/public/media/<slug>.mp4`, run `ffmpeg -i clip.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an clip.webm` for the WebM twin, export its **first frame** (`ffmpeg -i clip.mp4 -frames:v 1 first.png`), redraw or ink it as the poster so the dissolve lines up, then update that project's `media` (`clip`, `poster`, `status: "final"`, `note`). The "Development media" flag disappears automatically.

## Narration (AI voice)

Each page's narration line is in `content/narration.json`. Record it once with Gemini text-to-speech (needs `GEMINI_API_KEY`):

```bash
cd backend && python generate_narration.py --samples      # audition voices in frontend/public/media/voice-samples/
```

```bash
cd backend && python generate_narration.py                # record every page (only changed pages on later runs)
```

Choose the voice with `NARRATION_VOICE` in `backend/.env`. Files and `manifest.json` go to `frontend/public/media/narration/` (MP3 with `lameenc`, otherwise WAV); rebuild the site afterwards. Visitors turn narration on with the 🔊 Narrate balloon; captions are shown, audio only starts after that click, and until recordings exist the browser's built-in voice is used.

## The avatar

The character is "Stylized anime character" by pinguinoconpulgares (Sketchfab, **CC BY 4.0**, credit shown inside the back cover). The original is in `assets/avatar/final/`; the web copy is `frontend/public/avatar/comic-character.glb` (textures re-encoded, geometry unchanged).

Everything about it is in `frontend/src/avatar/config.ts`: model path, bone names, the relaxed `restPose` (the model ships in an A-pose with no animations), and the licence credit. It keeps its own flat comic shading and built-in ink outline. To swap models: change `model`, the bone names and `restPose`, then check `/lab/rig` (bone offsets can be tried from the URL, e.g. `/lab/rig?upperarm_L_GUY_RIG=0,0,-0.8`). Regenerate the chat portrait with `node tools/render-portrait.cjs` while the dev server runs.

`frontend/src/three/toon.ts` is a reusable cel-shading tool for models without their own comic shading.

## Deployment (Vercel)

`vercel.json` builds the frontend (`frontend/dist`), deploys `api/*.py` as Python functions (packages from the root `requirements.txt`, about 160 MB, under Vercel's limit), and sends every other path to the book.

1. Push the repository to GitHub.
2. In Vercel: **Add New → Project → import the repository**. Leave the framework as "Other"; `vercel.json` supplies the build settings.
3. **Settings → Environment Variables** (Production): `GEMINI_API_KEY`, `APP_ENV=production`, `CONTACT_TO_EMAIL`, `MAIL_FROM`, `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and optionally `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
4. Deploy, then open `https://<your-project>.vercel.app/api/health`: `index.ok`, `chat.configured` and `contact.configured` should all be true.
5. Ask a starter question on the Ask Zohair page, and send a uniquely titled test letter through the contact page; capture the received email (mask unrelated inbox contents).

Every push to GitHub redeploys automatically. Alternatives: `Dockerfile` / `render.yaml` run the same backend as one long-running server.

## Tests

```bash
cd frontend && npx vitest run
```

```bash
cd backend && . .venv/bin/activate && python -m pytest -q
```

With the site running (dev on :5173, or `python app.py` on :5000):

```bash
node tests/book.cjs http://127.0.0.1:5000 docs/screenshots
```

```bash
cd backend && . .venv/bin/activate && python evaluate.py     # writes docs/evaluation.md
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Chat says "isn't configured" or "key was rejected" | `GEMINI_API_KEY` missing or invalid. Run `python check_gemini.py`. Errors are never shown as answers |
| `/api/health` shows `index.ok: false` | Its `reason` names the problem (usually the Gemini key). The index rebuilds automatically once the key works |
| Contact says "Not emailed" | `EMAIL_PROVIDER=dev-log`; set `smtp` or `resend` |
| Contact 503 in production | Missing `CONTACT_TO_EMAIL`, `MAIL_FROM` or provider credentials; see `/api/health` |
| The book shows flat pages ("reading mode") | WebGL is unavailable or crashed on that device; that fallback is intentional. `/read` opens it on purpose |
| A YouTube video says "unavailable" | Check the video is Public/Unlisted with embedding allowed; the "Watch on YouTube" link under it always works |
| Gmail SMTP rejects login | Use an App Password with 2-Step Verification, or a transactional provider |
