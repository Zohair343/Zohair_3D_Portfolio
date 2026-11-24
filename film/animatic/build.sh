#!/usr/bin/env bash
# Builds the 45 s animatic (H.264 MP4 + VP9 WebM), captions and poster from storyboard cards.
# Segment boundaries match the storyboard: 0-5, 5-15, 15-20, 20-25, 25-32, 32-39, 39-45 s.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../frontend/public/media/film
mkdir -p "$OUT"
F=(01-cover 02-scorched 03-darkness 04-lastdance 05-maze 06-ned 07-close)
L=(5.5 10.5 5.5 5.5 7.5 7.5 6.0)
T=(slideleft slideleft slideleft slideleft fade slideleft)
inputs=(); fc=""
for i in "${!F[@]}"; do
  inputs+=(-i "frames/${F[$i]}.png")  # single frame: zoompan generates d frames from it
  n=$(python3 -c "print(int(${L[$i]}*30))")
  fc+="[$i:v]scale=1600:900,zoompan=z='min(zoom+0.0005,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$n:s=1280x720:fps=30,setsar=1[v$i];"
done
prev="v0"; acc=0
for i in 1 2 3 4 5 6; do
  acc=$(python3 -c "print(round($acc + ${L[$((i-1))]} - 0.5, 2))")
  fc+="[$prev][v$i]xfade=transition=${T[$((i-1))]}:duration=0.5:offset=$acc[x$i];"; prev="x$i"
done
fc+="[$prev]format=yuv420p[out]"
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$fc" -map "[out]" -r 30 -c:v libx264 -profile:v high -preset slow -crf 22 -movflags +faststart "$OUT/portfolio-animatic.mp4"
ffmpeg -loglevel error -y -i "$OUT/portfolio-animatic.mp4" -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -cpu-used 4 "$OUT/portfolio-animatic.webm"
cp frames/01-cover.png "$OUT/film-poster.png"
cat > "$OUT/portfolio-animatic.en.vtt" <<'VTT'
WEBVTT

00:00.500 --> 00:04.800
Muhammad Zohair Shaikh — Game Developer.

00:05.300 --> 00:14.800
Scorched. Land three hits to unlock the slow-motion gun ability.

00:15.300 --> 00:19.800
Darkness Within. Riddles, inventory, and an enemy that follows you on the NavMesh.

00:20.300 --> 00:24.800
Last Dance. A murder mystery across three clubs.

00:25.300 --> 00:31.800
Finish the maze, then Dijkstra's algorithm shows the shortest path.

00:32.300 --> 00:38.800
Computer Science at NED University. Runner-up at the CEGA Game Jam.

00:39.300 --> 00:44.800
Explore the projects. Ask me how they work.
VTT
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/portfolio-animatic.mp4"
