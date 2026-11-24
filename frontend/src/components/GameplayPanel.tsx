import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMedia } from './MediaCoordinator';
import { useReducedMotion } from '../lib/useReducedMotion';

interface Props {
  id: string;
  title: string;
  poster: string;
  posterAlt: string;
  clip?: string;
  status: 'final' | 'development' | 'pending';
  note?: string;
  /** Overlays drawn on the inked art only (captions, insets). They leave with the art. */
  artOverlay?: ReactNode;
  /** Overlays that stay above both art and video (e.g. the heavy border inset). */
  children?: ReactNode;
  className?: string;
  playLabel?: string;
  /** WebVTT captions for spoken content. */
  captions?: string;
}

type State = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The signature interaction: an inked panel that dissolves (halftone mask) into
 * the first frame of the matching clip while the panel border stays in place.
 */
export default function GameplayPanel({ id, title, poster, posterAlt, clip, status, note, artOverlay, children, className = '', playLabel = 'Play gameplay', captions }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  // React clears element refs before unmount cleanups run, so keep our own handle.
  const lastVideo = useRef<HTMLVideoElement | null>(null);
  const { claim, release } = useMedia();
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>('idle');
  const [revealed, setRevealed] = useState(false);
  const storeKey = `pp-clip:${clip}`;
  const [resumeAt, setResumeAt] = useState<number>(() => {
    try { return Number(sessionStorage.getItem(storeKey) || 0); } catch { return 0; }
  });

  // Pause and remember position when the page closes (component unmounts).
  useEffect(() => {
    const ref = lastVideo; // read at cleanup time: the <video> mounts only after Play
    return () => {
      const v = ref.current;
      if (!v) return;
      try { if (v.currentTime > 0 && !v.ended) sessionStorage.setItem(storeKey, String(v.currentTime)); } catch { /* storage unavailable */ }
      v.pause();
      release(v);
    };
  }, [release, storeKey]);

  // The <video> is mounted only after the visitor asks for it: no idle media elements,
  // and nothing for page snapshots to wait on.
  const [mounted, setMounted] = useState(false);
  const start = () => { if (clip) { setState('loading'); setMounted(true); } };
  useEffect(() => { if (mounted && state === 'loading') void play(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mounted]);

  const play = async () => {
    const v = video.current;
    if (!v || !clip) return;
    v.onerror = null;
    v.querySelector('source:last-of-type')?.addEventListener('error', () => setState('error'), { once: true });
    if (!v.currentSrc) v.load();
    if (resumeAt > 0 && v.currentTime === 0) {
      await new Promise<void>((r) => { if (v.readyState >= 1) r(); else v.addEventListener('loadedmetadata', () => r(), { once: true }); });
      v.currentTime = resumeAt;
    }
    claim(v);
    try { await v.play(); } catch { setState('error'); }
  };

  return (
    <figure id={id} className={`panel gameplay ${revealed ? 'revealed' : ''} ${reduced ? 'no-motion' : ''} ${className}`} aria-labelledby={`${id}-cap`}>
      <div className="gameplay-stage">
        {mounted && <video
          ref={(el) => { video.current = el; if (el) lastVideo.current = el; }}
          className="gameplay-video"
          poster={poster}
          preload="none"
          playsInline
          controls={revealed}
          aria-label={`${title} gameplay clip${status !== 'final' ? ' (development media)' : ''}`}
          onPlaying={() => { setState('playing'); setRevealed(true); }}
          onPause={() => setState((s) => (s === 'ended' ? s : 'paused'))}
          onEnded={() => { setState('ended'); try { sessionStorage.removeItem(storeKey); } catch { /* */ } setResumeAt(0); }}
        >
          {clip && <source src={clip.replace(/\.mp4$/, '.webm')} type="video/webm" />}
          {clip && <source src={clip} type="video/mp4" />}
          {captions && <track kind="captions" src={captions} srcLang="en" label="English" default />}
        </video>}
        <div className="gameplay-art" aria-hidden={revealed}>
          <img src={poster} alt={posterAlt} />
          {artOverlay}
        </div>
        {!revealed && (
          <div className="gameplay-cta">
            {clip ? (
              <button className="btn" onClick={start} disabled={state === 'loading'} aria-describedby={`${id}-cap`}>
                <span aria-hidden="true">▶</span> {state === 'loading' ? 'Loading…' : resumeAt > 0 ? `Resume from ${fmt(resumeAt)}` : playLabel}
              </button>
            ) : (
              <span className="badge-dev">Gameplay clip pending</span>
            )}
          </div>
        )}
        {status !== 'final' && <span className="badge-dev media-flag">Development media · not gameplay</span>}
        {children}
      </div>
      <figcaption id={`${id}-cap`} className="gameplay-cap small">
        {state === 'error' ? <strong role="alert">The clip couldn’t be played in this browser. </strong> : null}
        {note}
      </figcaption>
    </figure>
  );
}
