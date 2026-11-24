#!/usr/bin/env bash
# Builds clearly labelled DEVELOPMENT clips whose first frame equals the poster.
# Replace with real footage via tools/derive-poster.sh (see README → Media).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FONT="${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
TMP="$(mktemp -d)"
node "$ROOT/tools/render-svgs.cjs" "$TMP" "$ROOT"/frontend/public/art/*.svg
for slug in scorched-arena darkness-within last-dance maze-pathfinding; do
  out="$ROOT/frontend/public/media/dev/${slug/-arena/}-dev.mp4"
  ffmpeg -loglevel error -y -loop 1 -i "$TMP/$slug.png" -t 8 -r 30 -filter_complex "\
    [0:v]scale=2560:1440,zoompan=z='1+0.0009*on':x='iw/2-(iw/zoom/2)+on*0.6':y='ih/2-(ih/zoom/2)':d=240:s=1280x720:fps=30,\
    drawbox=enable='gte(n,15)':x=0:y=ih/2-60:w=iw:h=120:color=black@0.78:t=fill,\
    drawtext=enable='gte(n,15)':fontfile=$FONT:text='DEVELOPMENT MEDIA — NOT GAMEPLAY':fontcolor=white:fontsize=48:x=(w-tw)/2:y=h/2-38,\
    drawtext=enable='gte(n,15)':fontfile=$FONT:text='Real clip pending from the developer':fontcolor=0xF7E39A:fontsize=26:x=(w-tw)/2:y=h/2+18,format=yuv420p" \
    -c:v libx264 -preset slow -crf 26 -movflags +faststart -an "$out"
  echo "built $out"
done
rm -rf "$TMP"
