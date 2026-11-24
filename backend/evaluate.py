"""Ask Zohair evaluation. Writes docs/evaluation.md.

    python evaluate.py          # retrieval checks always; live answers if ANTHROPIC_API_KEY is set
"""
import json
import os
from pathlib import Path

import rag

CASES = [
    {"type": "Factual", "q": "How does the three-hit combo work in Scorched?", "expect": ["scorched.slow-motion", "scorched.combo"], "supported": True},
    {"type": "Factual", "q": "Which game jam did Zohair finish as runner-up in?", "expect": ["journey.cega"], "supported": True},
    {"type": "Factual", "q": "When does the maze game show the shortest path?", "expect": ["maze-pathfinding.dijkstra"], "supported": True},
    {"type": "Cross-project", "q": "How did Zohair use NavMesh in his games?", "expect": ["scorched.enemies", "darkness-within.threat"], "supported": True},
    {"type": "Cross-project", "q": "Compare the enemy AI in Scorched and Darkness Within.", "expect": ["scorched.enemies", "darkness-within.threat"], "supported": True},
    {"type": "Unsupported", "q": "How many copies did Scorched sell?", "expect": [], "supported": False},
    {"type": "Unsupported", "q": "What game did Zohair make at the CEGA Game Jam?", "expect": [], "supported": False},
]


def main():
    idx = {c["id"]: c for c in rag.get_index().chunks}
    import config
    live = bool(os.getenv("GEMINI_API_KEY") if config.LLM_PROVIDER == "gemini" else os.getenv("ANTHROPIC_API_KEY"))
    setup = f"LLM: {config.LLM_PROVIDER} ({config.GEMINI_CHAT_MODEL if config.LLM_PROVIDER == 'gemini' else config.CHAT_MODEL}); embeddings: {rag.get_index().meta['embed_model']}" 
    rows, passed = [], 0
    print(f"Evaluating {len(CASES)} questions ({'live answers' if live else 'retrieval only'})…", flush=True)
    for n, c in enumerate(CASES, 1):
        print(f"  [{n}/{len(CASES)}] {c['q']}", flush=True)
        got = [h.chunk["id"] for h in rag.retrieve(c["q"])]
        recall = all(e in got[:8] for e in c["expect"])
        urls = ", ".join(f"`{idx[e]['url']}`" for e in c["expect"]) or "—"
        if live:
            try:
                out = rag.answer(c["q"])
                status = out["status"]
                ok = (status == "answered") == c["supported"] and all(any(x["id"] == e for x in out["citations"]) for e in c["expect"][:1])
                ans = out["answer"].replace("|", "\\|")
                cites = ", ".join(f"`{x['url']}`" for x in out["citations"]) or "none"
            except rag.ProviderUnavailable as e:
                ok, status, ans, cites = False, "error", e.message, "—"
        else:
            ok, status, ans, cites = None, "pending", "Not run: no chat provider key in this environment. Run `python evaluate.py` with GEMINI_API_KEY set.", "—"
        passed += bool(recall)
        rows.append(f"| {c['type']} | {c['q']} | {'✅' if recall else '❌'} {', '.join(got[:4])} | {urls} | {status} | {ans} | {cites} | {'—' if ok is None else ('✅' if ok else '❌')} |")
    md = ["# Ask Zohair: evaluation", "", f"Setup: {setup}.", "",
          f"Live answers: **{'run' if live else 'pending (no provider key)'}**. Retrieval: **{passed}/{len(CASES)}** cases retrieved every expected panel in the top 8.", "",
          "| Type | Question | Retrieval (top 4) | Expected citation target | Answer status | Answer | Cited links | Answer check |",
          "|---|---|---|---|---|---|---|---|", *rows, "",
          "Expected citation targets are opened in a real browser by `tests/citations.cjs`, which confirms that the panel with that id exists, scrolls into view and receives focus.",
          "Unsupported questions have no expected panel: the correct outcome is status `insufficient` with no citations (for example “The portfolio doesn’t include sales figures for Scorched.”)."]
    out = Path(__file__).resolve().parents[1] / "docs/evaluation.md"
    out.write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md))
    print(f"\nWrote {out}", flush=True)
    json.dump([{**c, "url": [idx[e]["url"] for e in c["expect"]]} for c in CASES], open(Path(__file__).parent / "eval_cases.json", "w"), indent=1)


if __name__ == "__main__":
    main()
