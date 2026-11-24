import os
import sys
from pathlib import Path

# Tests run offline: local embeddings (no key) and a throwaway index cache.
os.environ.setdefault("EMBED_PROVIDER", "local")
os.environ.setdefault("INDEX_CACHE_DIR", "/tmp/playable-pages-test-index")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
