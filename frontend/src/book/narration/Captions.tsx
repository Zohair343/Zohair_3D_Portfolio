import { useSyncExternalStore } from 'react';
import { speech } from '../../avatar/speech';

/** What the narrator is saying, as text: for deaf and hard-of-hearing visitors and noisy rooms. */
export function Captions({ onStop }: { onStop: () => void }) {
  const snap = useSyncExternalStore(speech.subscribe, () => `${speech.speaking}|${speech.text}|${speech.source}`);
  const [speaking, text, source] = snap.split('|');
  if (speaking !== 'true' || !text) return null;
  return (
    <div className="captions" role="status" aria-live="polite">
      <span className="tag captions-tag">{source === 'recorded' ? 'AI voice' : 'Browser voice'}</span>
      <p>{text}</p>
      <button className="captions-stop" onClick={onStop} aria-label="Stop narration">■</button>
    </div>
  );
}
