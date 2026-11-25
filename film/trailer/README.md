# Playable Pages trailer (30 s)

A 30-second comic-style promo for the portfolio: 1920×1080, 30 fps, H.264 + AAC.

| Time | Section |
|---|---|
| 0–4 s | Title: name and role slam in on a halftone burst |
| 4–8 s | Push-in on the real cover and avatar, speech bubble |
| 8–13 s | Skills on the beat (the music's drop is placed at 8.0 s) |
| 13–24 s | The real Projects page, then one shot per project (YouTube thumbnails and the maze art) |
| 24–30 s | Splash page with the cover, projects and URL; "ENTER MY WORLD" at 27.2 s |

## How it is built
- `video.js` draws every frame as a pure function of time (`render(t)`), following the runtime contract of
  [bangmotion-visual-director](https://github.com/kimmokdong/bangmotion-visual-director). Text, timings and the URL are in `CONFIG` at the top.
- `assets/`: screenshots of the live portfolio, the YouTube thumbnails of the projects, the maze art.
- `sound.json`: music and sound-effect cues; the mix is made by that repo's `scripts/sound.js` (-16 LUFS).
- Render: `node <bangmotion>/scripts/render-demo.js --url film/trailer/index.html --out film/trailer/out/playable-pages-trailer.mp4 --fps 30`
  (frame-exact: each frame is seeked and captured, then encoded with ffmpeg). Web copies are re-encoded into `frontend/public/media/film/`.

## Credits
- Music: "Bring It To Me" by Alex Kizenkov (supplied file; Pixabay Content License).
- Sound effects: CC0 1.0 (Kenney audio packs, Freesound CC0 sounds) from the bangmotion repo's `sound/sfx`, listed in its `sound/LICENSES.md`.
- Fonts: Barlow Condensed and Atkinson Hyperlegible Next (SIL Open Font License).
