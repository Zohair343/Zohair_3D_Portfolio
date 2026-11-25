# Semester submission checklist

Legend: ✅ Verified (opened or exercised through its normal entry point) · 🟡 Built, verification blocked by a named dependency · ⏳ Pending input/action.
Verification date: 2026-11-23, local production build (`gunicorn` serving `frontend/dist`) in Chromium at 1366×900 and Pixel 7 emulation.

| # | Deliverable | Path / URL | Verification performed | Status |
|---|---|---|---|---|
| 1 | Frontend source | `frontend/` | `tsc` clean; `vitest` 10/10; production build; E2E `tests/slice.cjs` desktop + mobile (cover, Scorched dissolve → playing clip, back-nav resume, deep links, maze demo, no horizontal scroll, no page errors) | ✅ |
| 2 | Backend source | `backend/` | `pytest` 18/18 (validation, header injection, honeypot, rate limit, provider errors, citation guards, anchor ↔ panel check) | ✅ |
| 3 | GitHub repository / source archive | Local git repo (`main`); archive `playable-pages-source.tar.gz` | Archive created from the commit. **No GitHub remote was supplied** | ⏳ Remote: create a repo and `git push` |
| 4 | Placeholder avatar integrated and cel-shaded | `frontend/public/avatar/placeholder-avatar.glb` (1.4 MB, from the untouched `assets/avatar/source/Aariz_Hat.glb`), `frontend/src/three/toon.ts`, `frontend/src/config/avatar.ts` | Loads on cover and lab; textures, eyes, transparent lashes and hair cut-outs display; authored pose matches Blender; face readable at cover and portrait size, desktop + mobile; same-camera before/after `docs/screenshots/avatar-before-original.png` / `avatar-after-toon.png`; in-cover `cover-desktop.png`, `cover-mobile.png` | ✅ |
| 5 | Placeholder `.blend` (import of the supplied model) | `assets/avatar/blender/placeholder-avatar.blend`, render `docs/screenshots/avatar-blender-render.png` | Opened and rendered in Blender 4.2.3 (headless Cycles) | ✅ |
| 6 | **Final** original/customised Blender avatar, editable `.blend`, exported `.glb` | — | Not supplied | ⏳ Pending: Zohair's final avatar; swap steps in README |
| 7 | After Effects `.aep` + collected media | `film/AFTER_EFFECTS_PLAN.md` (timed comps, named layers, asset list) | After Effects not available in the build environment | ⏳ Pending: build in After Effects; needs gameplay footage + licensed music |
| 8 | Final 30–60 s MP4 film | `frontend/public/media/film/playable-pages-trailer.mp4` (30.0 s, 1920×1080, H.264 + AAC) + `.webm`, captions `.en.vtt`, transcript; source `film/trailer/` | Plays on the Film page with captions and transcript; licensed music and CC0 effects | ✅ MP4; `.aep` ⏳ |
| 9 | RAG chatbot (Gemini): UI, ingestion, index, config | `backend/providers/`, `rag.py`, `ingest.py`, `check_gemini.py`, `api/chat.py`, `frontend/src/book/ui/ChatBox.tsx` | 23 backend tests; live run on Zohair's machine (24 Nov 2026): key and models verified with `check_gemini.py`, 7/7 retrieval and 7/7 answer checks incl. both unsupported questions refused; citation links verified in the browser | ✅ |
| 10 | Knowledge sources, index instructions, pipeline note, evaluation table | `content/portfolio.json`, `README.md`, `docs/RAG_PIPELINE.md`, `docs/evaluation.md` | Evaluation run live with Gemini; table and review notes saved | ✅ |
| 11 | Contact form | `frontend/src/book/ui/LetterForm.tsx`, `backend/mailer.py`, `api/contact.py` | 28 backend tests (validation, header injection, honeypot, rate limits that only count sent letters, Resend request shape, rejection logging); real delivery through Resend confirmed by Zohair on his machine (24 Nov 2026) | ✅ |
| 12 | Evidence of a received test email | — | Delivery works locally; the submission screenshot should come from the deployed site: send a uniquely titled letter and capture it in the inbox (mask other mail) | ⏳ After Vercel deployment |
| 13 | Project report PDF | `docs/report/Playable_Pages_Report.pdf` | Generated from `docs/report/report.html`; opened, 9 pages, layout checked | ✅ (deployment/email/answer sections state what is pending) |
| 14 | Setup README | `README.md` | Commands used during this build | ✅ |
| 15 | Screenshots of major modules | `docs/screenshots/` (18 files) | Captured from the running production build | ✅ (live chatbot answer and received-email screenshots pending, see 9 and 12) |
| 16 | Deployment config | `vercel.json`, `api/*.py`, `requirements.txt`, `.vercelignore` (also `Dockerfile`, `render.yaml`) | Function files tested locally by path; dependency bundle measured at 159 MB | 🟡 Not yet deployed (needs Vercel account) |
| 17 | Verified live deployment URL | — | — | ⏳ Needs a hosting account (e.g. Render) + secrets |

## Inputs still needed (by name)
1. Gameplay clips: Scorched (combo + slow-motion), Darkness Within (enemy pursuit, a riddle or inventory moment), Last Dance (clue interaction), 2D Maze (shortest-path display). Each missing clip blocks only its own panel; dev media stands in, labelled on-frame.
2. Last Dance clue art/screenshots, to make the evidence board use real clues.
3. Project or repository links per game (`links` in `content/portfolio.json`).
4. Final avatar (`.blend` + `.glb`).
5. `ANTHROPIC_API_KEY` for the server (and for running the live evaluation).
6. Mail provider credentials + a verified sender (`MAIL_FROM`).
7. Hosting account and GitHub repository.
8. Confirmation that the "WASL LOGO" texture on the placeholder may be shown publicly.
9. Any employment/internship details (none are shown until confirmed).
