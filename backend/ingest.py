"""Builds the Ask Zohair knowledge index.

    python ingest.py            # rebuild backend/index/ from content/

Sources: content/portfolio.json (public portfolio text) plus any approved
Markdown in content/knowledge/*.md. Private contact details and visitor
messages are never read here. Each chunk keeps a source title, a section id
and the portfolio URL anchor of the panel it came from.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from pathlib import Path

import numpy as np

import config

PRIVATE = [re.compile(r"\+?\d[\d\s-]{8,}\d"), re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")]


def _clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    for pat in PRIVATE:  # defence in depth: no phone numbers / emails in the index
        text = pat.sub("[removed]", text)
    return text


def build_chunks(content_dir: Path = config.CONTENT_DIR) -> list[dict]:
    data = json.loads((content_dir / "portfolio.json").read_text(encoding="utf-8"))
    chunks: list[dict] = []

    def add(cid, title, section, url, text, project=None):
        chunks.append({"id": cid, "title": title, "section": section, "url": url, "project": project, "text": _clean(text)})

    p = data["profile"]
    add("profile", "Cover: who Zohair is", "profile", "/", f"{p['name']} is a {p['role']} based in {p['location']}. {p['intro']}")

    for panel in data["about"]["panels"]:
        add(f"about.{panel['id']}", f"About: {panel['title']}", panel["id"], f"/about#{panel['id']}",
            f"About {p['name']}. {panel['caption']}. {panel['body']}")

    for g in data["skills"]["groups"]:
        names = ", ".join(i["name"] for i in g["items"])
        evidence = "; ".join(f"{i['name']} is demonstrated at {i['evidence']}" for i in g["items"] if i.get("evidence"))
        add(f"skills.{g['id']}", f"Skills: {g['title']}", f"skills-{g['id']}", f"/skills#skills-{g['id']}",
            f"Zohair's verified skills under {g['title']}: {names}. {evidence}")

    for proj in data["projects"]:
        slug, name = proj["slug"], proj["title"]
        head = f"Project: {name} ({proj['genre']}, {proj['engine']})."
        add(f"{slug}.overview", f"{name}: overview", "overview", f"/projects/{slug}", f"{head} {proj['premise']}", slug)
        for panel in proj["panels"]:
            add(f"{slug}.{panel['id']}", f"{name}: {panel['title']}", panel["id"], f"/projects/{slug}#{panel['id']}",
                f"{head} Section: {panel['title']} — {panel['caption']}. {panel['body']}", slug)

    j = data["journey"]
    ned, *earlier = j["education"]
    add("journey.ned", "Education: BS Computer Science, NED University", "ned", "/journey#ned",
        f"Education and studies: Zohair is studying for a {ned['title']} degree at {ned['org']} (university), {ned['period']}, as a final-year undergraduate specializing in game development. {ned['detail']}. Relevant coursework: {', '.join(ned['coursework'])}.")
    add("journey.earlier", "Education: A Levels and O Levels", "earlier-education", "/journey#earlier-education",
        "Earlier education: " + " ".join(f"{e['title']}: {e['org']}, {e['detail']}." for e in earlier))
    for a in j["achievements"]:
        kind = "Award" if a["type"] == "award" else "Participation"
        add(f"journey.{a['id']}", f"Achievement: {a['title']}", a["id"], f"/journey#{a['id']}", f"{kind}: {a['title']} ({a['place']}). {a['body']}")
    xp = j["experience"]
    add("journey.practice", "Experience: practical project experience", xp["id"], f"/journey#{xp['id']}", xp["body"])

    # Approved extra documents: one chunk per '## ' heading. Front line '# Title' and optional 'url: /path'.
    for md in sorted((content_dir / "knowledge").glob("*.md")):
        raw = md.read_text(encoding="utf-8")
        title = (re.search(r"^# (.+)$", raw, re.M) or [None, md.stem])[1]
        url = (re.search(r"^url: (\S+)$", raw, re.M) or [None, "/"])[1]
        for i, sec in enumerate(re.split(r"^## ", raw, flags=re.M)[1:]):
            heading, _, body = sec.partition("\n")
            add(f"doc.{md.stem}.{i}", f"{title}: {heading.strip()}", f"{md.stem}-{i}", url, f"{title}. {heading.strip()}. {body}")

    ids = [c["id"] for c in chunks]
    assert len(ids) == len(set(ids)), "duplicate chunk ids"
    return chunks


def content_hash(chunks: list[dict]) -> str:
    return hashlib.sha256(json.dumps(chunks, sort_keys=True).encode()).hexdigest()[:16]


def build_vectors(chunks: list[dict]):
    """Embeds title + text (so a mechanic stays attached to its game) into a FAISS index."""
    import faiss
    from providers.embeddings import get_embedder

    emb = get_embedder()
    vecs = emb.embed_docs([f"{c['title']}. {c['text']}" for c in chunks])
    faiss.normalize_L2(vecs)
    index = faiss.IndexFlatIP(vecs.shape[1])
    index.add(vecs)
    meta = {"embed_model": emb.name, "dim": int(vecs.shape[1]), "content_hash": content_hash(chunks), "count": len(chunks), "built_at": int(time.time())}
    return index, meta


def write_index(index, meta: dict, chunks: list[dict], out_dir: Path) -> None:
    import faiss

    out_dir.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(out_dir / "portfolio.faiss"))
    (out_dir / "chunks.json").write_text(json.dumps({"meta": meta, "chunks": chunks}, indent=1), encoding="utf-8")


def build_index(out_dir: Path = config.INDEX_DIR) -> dict:
    t0 = time.time()
    chunks = build_chunks()
    index, meta = build_vectors(chunks)
    write_index(index, meta, chunks, out_dir)
    meta["seconds"] = round(time.time() - t0, 2)
    return meta


if __name__ == "__main__":
    m = build_index()
    print(f"Indexed {m['count']} chunks with {m['embed_model']} (dim {m['dim']}) in {m['seconds']}s → {config.INDEX_DIR}")
    print("Commit backend/index/ so deployments start with a ready index (they rebuild it themselves if it is stale).")
    sys.exit(0)
