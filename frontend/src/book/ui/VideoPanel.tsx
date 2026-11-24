import { music } from '../music/music';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import GameplayPanel from '../../components/GameplayPanel';
import { usePage } from '../engine/PageContext';

interface Props {
  id: string;
  title: string;
  poster: string;
  posterAlt: string;
  /** YouTube video id (preferred) … */
  youtube?: string;
  /** … or a local clip (mp4 with a .webm twin). */
  clip?: string;
  captions?: string;
  status: 'final' | 'development';
  note?: string;
  artOverlay?: ReactNode;
}

/**
 * The signature panel: inked art first, then the gameplay plays inside the same border.
 * Remounts when its page closes, which stops playback and keeps snapshots clean.
 */
export default function VideoPanel(props: Props) {
  const { live } = usePage();
  const key = live ? 'live' : 'idle';
  return props.youtube ? <YouTubePanel key={key} {...props} youtube={props.youtube} /> : (
    <GameplayPanel key={key} id={props.id} title={props.title} poster={props.poster} posterAlt={props.posterAlt} clip={props.clip}
      status={props.status} note={props.note} artOverlay={props.artOverlay} captions={props.captions} />
  );
}

/** Why YouTube refused to play, in words a visitor understands (codes from the IFrame Player API). */
const YT_ERRORS: Record<number, string> = {
  2: 'YouTube rejected the video address.',
  5: 'This browser can’t play the video.',
  100: 'The video was removed or made private.',
  101: 'The video’s owner or a copyright claim blocks playback on other websites.',
  150: 'The video’s owner or a copyright claim blocks playback on other websites.',
  152: 'YouTube blocked playback inside this page.',
  153: 'YouTube blocked playback inside this page.',
};

/**
 * YouTube with a click-to-load facade: no YouTube request until the visitor presses Play.
 * Talks to the player through YouTube's official postMessage protocol: the art gives way when
 * YouTube reports "playing", and a readable fallback appears if YouTube reports an error.
 */
function YouTubePanel({ id, title, poster, posterAlt, youtube, note, artOverlay }: Props & { youtube: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const src = `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  const watchUrl = `https://youtu.be/${youtube}`;

  const active = state === 'loading' || state === 'playing';
  /** YouTube's own player state (1 playing, 3 buffering, 2 paused, 0 ended); null until it reports one. */
  const [ytState, setYtState] = useState<number | null>(null);
  // Background music is silent while the video plays and comes back when it is paused or finishes.
  const silenceMusic = active && (ytState === null || ytState === 1 || ytState === 3);
  useEffect(() => { music.duck(`yt-${id}`, silenceMusic); return () => music.duck(`yt-${id}`, false); }, [silenceMusic, id]);
  useEffect(() => {
    if (state !== 'loading') return;
    const t = setTimeout(() => setState((s) => (s === 'loading' ? 'playing' : s)), 6000); // never stay stuck on "Loading…"
    return () => clearTimeout(t);
  }, [state]);
  // Listen for as long as the player exists: YouTube can report an error after the art has gone.
  useEffect(() => {
    if (!active) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      let msg: { event?: string; info?: unknown };
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.event === 'onError') { setErrorCode(Number(msg.info)); setState('error'); }
      const info = msg.info as { playerState?: number } | undefined;
      if (msg.event === 'infoDelivery' && typeof info?.playerState === 'number') setYtState(info.playerState);
      if (msg.event === 'onStateChange' && typeof msg.info === 'number') setYtState(msg.info);
      if (msg.event === 'infoDelivery' && info?.playerState === 1) setState((s) => (s === 'error' ? s : 'playing'));
      if (msg.event === 'onStateChange' && msg.info === 1) setState((s) => (s === 'error' ? s : 'playing'));
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [active]);

  const onLoad = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    // Subscribe to player events, then start at half volume (some uploads are loud).
    w.postMessage(JSON.stringify({ event: 'listening', id, channel: 'widget' }), '*');
    w.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [50], id, channel: 'widget' }), '*');
  };

  return (
    <figure id={id} className={`panel gameplay ${state === 'playing' ? 'revealed' : ''}`} aria-labelledby={`${id}-cap`}>
      <div className="gameplay-stage">
        {(state === 'loading' || state === 'playing') && (
          <iframe ref={frame} className="gameplay-video" src={src} title={`${title} gameplay video (YouTube)`} onLoad={onLoad}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        )}
        <div className="gameplay-art" aria-hidden={state === 'playing'}>
          <img src={poster} alt={posterAlt} />
          {artOverlay}
        </div>
        {(state === 'idle' || state === 'loading') && (
          <div className="gameplay-cta">
            <button className="btn" onClick={() => setState('loading')} disabled={state === 'loading'}>
              <span aria-hidden="true">▶</span> {state === 'loading' ? 'Loading…' : 'Play gameplay'}
            </button>
          </div>
        )}
        {state === 'error' && (
          <div className="yt-error" role="alert">
            <p><strong>This video can’t play here.</strong> {YT_ERRORS[errorCode ?? 0] ?? `YouTube reported error ${errorCode}.`}</p>
            <a className="btn" href={watchUrl} target="_blank" rel="noopener noreferrer">▶ Watch on YouTube</a>
          </div>
        )}
      </div>
      <figcaption id={`${id}-cap`} className="gameplay-cap small">{note ?? `Gameplay from ${title}, played on YouTube.`}</figcaption>
    </figure>
  );
}
