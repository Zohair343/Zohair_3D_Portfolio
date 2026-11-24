# Viva cheat sheet: live changes

Run the dev server first (changes appear as soon as you save):

```bash
cd frontend
npm run dev
```

Open http://127.0.0.1:5173. To use the chatbot too, also run `python app.py` in `backend` (venv active).

## Where things live

| I want to change… | File | What to edit |
|---|---|---|
| Any wording (projects, about, skills, education) | `content/portfolio.json` | The text. Then run `python ingest.py` in `backend` so the chatbot knows it too |
| The order of pages | `frontend/src/book/book.config.ts` | Move a line up or down |
| Which chapters have a tab | `frontend/src/book/book.config.ts` | Add or remove `tab: 'Label'` on a page |
| What's in a tab's drop-down menu (e.g. Projects ▾) | `frontend/src/book/book.config.ts` | Add `subtab: 'Label'` to a page; it joins the menu of the tab above it |
| A page's paper colour | `frontend/src/book/book.config.ts` | `paper: '#rrggbb'` |
| A page's layout | `frontend/src/book/pages/<Chapter>.tsx` | The JSX for that page |
| Site colours and fonts | `frontend/src/styles/global.css` | Tokens at the top (`--paper`, `--ink`, `--caption`, `--display`, `--body`) |
| Page styles (panels, balloons, cover) | `frontend/src/book/book.css` | Grouped by section |
| A project's YouTube video | `content/portfolio.json` | `media.youtube` = the id after `youtu.be/` |
| How fast pages turn | `frontend/src/book/engine/constants.ts` | `TURN_S` (seconds per page) |
| How much paper curls | `frontend/src/book/engine/scene.tsx` | `PAPER_CURL` (`curl`, `cornerLead`) |
| The chatbot's AI model | `backend/.env` (locally) or Vercel → Environment Variables | `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite`, then restart `python app.py`. `python check_gemini.py` lists what your key can use |
| The chatbot's rules (tone, length) | `backend/rag.py` | The `SYSTEM` prompt at the top |
| The pointing hand (size, height, speed) | `frontend/src/avatar/config.ts` | `pointing`: `minScale` (hand size), `shoulderZ` (how high above the page), `enterSeconds` (slide-in speed) |
| What the hand points at | `frontend/src/book/engine/Book.tsx` | `SELECTOR` in the pointing-hand section (buttons and links; form fields are excluded) |
| How the cover character follows the cursor | `frontend/src/avatar/config.ts` | `lookAt`: `yaw`/`pitch` (how far it turns), `speed` (how quickly) |
| What the narrator says on a page | `content/narration.json` | The page's line; then `python generate_narration.py` re-records only changed pages, and `npm run build` |
| The narrator's voice | `backend/.env` | `NARRATION_VOICE=Puck` (audition with `python generate_narration.py --samples`), then `python generate_narration.py --all` |
| How much the narrator gestures | `frontend/src/avatar/talk.ts` | `T` at the top (`headNod`, `headTurn`, `armLift`, `forearm`) |
| The avatar's pose | `frontend/src/avatar/config.ts` | `restPose` (radians per bone) |
| The desk, lamp and props (positions, lamp brightness/colour) | `frontend/src/book/engine/desk.tsx` | `DESK` at the top (`lamp.base/elbow/head/target`, `lampIntensity`, `lampColor`); props are in `DeskProps` |
| Background music (track, volume) | `frontend/src/book/music/music.ts` | `MUSIC` at the top: `src`, `volume` (normal), `underNarration`. The file is `frontend/public/media/music/lay-low.mp3` |
| The résumé file | `frontend/public/Muhammad_Zohair_Shaikh_Resume.pdf` | Replace the file (same name). The button is in `pages/About.tsx` |
| The avatar's size/position on the cover | `frontend/src/book/engine/Book.tsx` | `<CoverAvatar … scale position>` |

## Common requests, step by step

**"Add a new page."**
1. Create `frontend/src/book/pages/MyPage.tsx`:
   ```tsx
   import { PageTitle } from '../ui/comic';
   export function MyPage() {
     return (
       <div className="face">
         <PageTitle kicker="New chapter" title="Hello" />
         <p>Anything here is real HTML on a 3D page.</p>
       </div>
     );
   }
   ```
2. In `book.config.ts`, import it and add one line where it should appear:
   `{ id: 'my-page', path: '/my-page', tab: 'Mine', Component: MyPage },`
3. Save. The book now has the page, a tab, and a URL. Pages pair into left and right automatically.

**"Add a project to the Projects menu."** Give its first page `subtab: 'My Game'` in `book.config.ts`. Keep the number of pages before the last one even, or a blank page is added to pair them.

**"Add a skill."** In `portfolio.json` → `skills.groups[…].items`, add `{ "name": "Godot" }`. To link it to proof: `{ "name": "Godot", "evidence": "/projects/scorched#combo" }`.

**"Change the button style."** Balloon buttons are `.balloon` in `book.css` (`border-radius` makes the oval, `::after` draws the tail).

**"Make the page turn slower."** In `constants.ts`, set `TURN_S = 2`.

**"Did my change break a page?"** Run `node tests/book.cjs http://127.0.0.1:5173`. The "every page fits" check names any page whose content no longer fits.

## How it works (one-minute explanation)

- **The book is a three.js scene** (via React Three Fiber): cover board, spine, page block (`engine/scene.tsx`), lying on a wooden desk with an architect lamp whose spotlight lights the pages and casts real shadows, plus a mug, pencil and sticky notes (`engine/desk.tsx`). Click the lamp to switch it off and on.
- **Each sheet bends as it turns.** A subdivided plane is re-shaped every frame: the angle grows from the spine to the free edge, so the paper rolls instead of flipping like a card. `engine/curl.ts`.
- **Open pages are real HTML in 3D space.** `CSS3DRenderer` places each page's HTML exactly on its 3D page, so text stays selectable and readable by screen readers, and buttons and forms work.
- **Turning pages are images.** Just before a page turns, its HTML is captured to a texture (`modern-screenshot`); the 3D page shows that image while it moves.
- **Ink outlines** come from three.js's `OutlineEffect`.
- **The registry** (`book.config.ts`) is the only list of pages. `engine/layout.ts` pairs them into sheets and spreads, and maps URLs and citation anchors (e.g. `/projects/scorched#combo`) to pages.
- **The pointing hand** is a second copy of the character standing just outside the book. Clipping planes hide everything except the arm (beyond the frame edge, and below the arm), and inverse kinematics (CCD: rotate shoulder, elbow and wrist in turn toward the target) brings the fingertip to the hovered button. It's drawn on its own transparent canvas above the page HTML so it is never hidden under page content. `src/avatar/PointingArm.tsx`, `src/avatar/ik.ts`.
- **Narration.** Each page's line (`content/narration.json`) is recorded once with Gemini text-to-speech (`backend/generate_narration.py`) and played by `src/book/narration/player.ts`. The Web Audio API measures the voice's loudness every frame; `src/avatar/talk.ts` turns that into head nods and hand gestures. The model has no jaw, so the mouth doesn't move. Captions show the text. Until recordings exist, the browser's own voice is used.
- **Ask Zohair** is retrieval-augmented generation: the question is embedded, matched against the portfolio's own text in a FAISS index, and the model must answer from those passages and cite them. A citation link turns the book to that panel.
- **Background music** (`src/book/music/music.ts`) starts quietly on the visitor's first click (browsers block sound before that), fades down while the narrator speaks, stops while a project video plays and resumes when it is paused or ends. The ♪ Music balloon turns it off, and the choice is remembered.
- **No 3D? Reading mode.** If WebGL is missing or crashes, the same pages show flat (`/read`).
