# Portfolio film: After Effects composition plan

**Status:** After Effects was not available in the build environment. The native `.aep` and final render are **pending**. A timed animatic (`frontend/public/media/film/portfolio-animatic.mp4`, 45.0 s, built by `film/animatic/build.sh`) follows this plan so the site's film panel, captions and transcript work now. Export the final render to the same path (H.264 MP4, plus a WebM twin) and update `content/film-transcript.json` (`statusTitle`/`statusNote`).

## Project settings
- 1920×1080, 30 fps, 45:00 duration, sRGB; master comp `00_MASTER`.
- Fonts: Barlow Condensed (ExtraBold/Black) for titles, Atkinson Hyperlegible Next for captions. Minimum caption hold: 2.5 s; maximum 7 words per line.
- Palette: paper `#F4ECDC`, ink `#1A1612`, caption `#F7E39A`; per-game accents as on the site (Scorched `#D9822B`, Darkness Within `#7FA37A`, Last Dance `#D63AA6`/`#6B3FB8`, Maze `#2F6DB5`/`#D94C3D`).
- Transition language: page-turn (CC Page Turn, 12 frames) between games; halftone dissolve (Effect › CC Ball Action or a halftone luma matte) from inked art to footage, matching the website's panel.

## Project panel folders
```
01_Comps/  02_Precomps/  03_Footage/{scorched,darkness-within,last-dance,maze}/  04_Art/ (SVGs from frontend/public/art)
05_Avatar/ (portrait.png, avatar renders)  06_Audio/{music,sfx}/  07_Type/  99_Reference/ (animatic MP4)
```

## Composition timeline (named layers)

| Time | Comp | Layers (top → bottom) | Notes |
|---|---|---|---|
| 0:00–0:05 | `01_INK_OPEN` | `TXT_Name`, `TXT_Role`, `AV_Avatar`, `SHP_PanelBorder` (Trim Paths 0→100% over 1.5 s), `BG_Paper` | Ink line draws the panel; avatar slides up from behind the lower border; name reveal at 2.5 s |
| 0:05–0:15 | `02_SCORCHED` | `CAP_ThreeHits`, `INSET_HitCounter`, `FTG_Scorched_Combo`, `FTG_Scorched_SlowMo`, `ART_ScorchedArena`, `SHP_Border` | Art → first frame of footage via halftone dissolve; melee combo then slow-motion ability. **Needs supplied footage** |
| 0:15–0:20 | `03_DARKNESS` | `CAP_NavMesh`, `FTG_Darkness_Threat`, `ART_Corridor` | Keep footage ungraded so dark scenes stay readable. **Needs footage** |
| 0:20–0:25 | `04_LASTDANCE` | `CAP_ThreeClubs`, `FTG_LastDance_Clue`, `ART_EvidenceBoard` | Page turn in; no solution shown. **Needs footage** |
| 0:25–0:32 | `05_MAZE_SKILLS` | `TXT_Skills` (Unity · Unreal Engine · Gameplay programming), `SHP_ShortestPath` (Trim Paths), `ART_Maze` | Path draws after the "player" route, matching the game's order of events |
| 0:32–0:39 | `06_NED_CEGA` | `TXT_NED`, `BADGE_RunnerUp`, `BG_Halftone` | Runner-up rosette styled like the site's award badge |
| 0:39–0:45 | `07_CLOSE` | `TXT_CTA` ("Explore the projects. Ask me how they work."), `TXT_URL`, `AV_Avatar` | Add the live portfolio URL once deployed |

## Audio
Original or properly licensed music only; record title, author, licence and URL in `film/CREDITS.md`. If narration is added, mix at −16 LUFS integrated with music ducked ≥ 8 dB under speech, and update the captions file.

## Asset list (required)
- Gameplay footage (pending from Zohair): Scorched combo + slow-motion ability; Darkness Within enemy pursuit; Last Dance clue interaction; Maze shortest-path display (original Unity build).
- Final avatar renders or the cel-shaded portrait (`frontend/public/avatar/portrait.png`).
- Cover art SVGs (`frontend/public/art/`).
- Music/SFX (pending selection and licence).

## Delivery
`film/Playable_Pages_Film.aep` + collected files (File › Dependencies › Collect Files) and `frontend/public/media/film/portfolio-film.mp4` (H.264 High, 1920×1080, 30 fps, ~10 Mbps, AAC 192 kbps). Update `content/film-transcript.json` to point at it.
