import type { BookApi } from '../engine/types';
import { askStore } from '../stores/askStore';

/** "Ask Zohair: …" — sends the question and turns to the chat page. */
export function AskChip({ book, q }: { book: BookApi; q: string }) {
  return (
    <button className="ask-chip" onClick={() => { askStore.set(q); book.goTo('ask'); }}>
      <span aria-hidden="true">💬</span> Ask Zohair: “{q}”
    </button>
  );
}
