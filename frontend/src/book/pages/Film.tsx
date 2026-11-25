import film from '@content/film-transcript.json';
import VideoPanel from '../ui/VideoPanel';
import { PageTitle } from '../ui/comic';

export function FilmPage() {
  return (
    <div className="face face-film">
      <PageTitle kicker="Chapter 5" title="Portfolio film" />
      <VideoPanel id="film-video" title="Portfolio film" poster={film.poster} posterAlt="Trailer title card: Muhammad Zohair Shaikh, Game Developer"
        clip={film.src} captions={film.captions} status="final" note={film.credits} playLabel="Play trailer" />
      <details className="transcript" open>
        <summary>Transcript</summary>
        <ol>{film.lines.map((l) => <li key={l.t}><span className="tc">{l.t}</span> {l.text}</li>)}</ol>
      </details>
    </div>
  );
}
