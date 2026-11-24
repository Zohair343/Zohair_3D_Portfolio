"""Text embeddings for retrieval. EMBED_PROVIDER=gemini (default) or local (fastembed, no key)."""
from __future__ import annotations

import os
from functools import lru_cache

import numpy as np

import config
from providers.errors import ProviderUnavailable


class GeminiEmbedder:
    """Gemini embeddings; documents and queries use their matching task types."""

    def __init__(self):
        self.model = config.GEMINI_EMBED_MODEL
        self.dim = config.EMBED_DIM
        self.name = f"gemini:{self.model}:{self.dim}"

    def _client(self):
        from google import genai

        if not os.getenv("GEMINI_API_KEY"):
            raise ProviderUnavailable("provider_unconfigured", "The chat service isn’t configured on this server yet, so it can’t answer questions.")
        from providers.llm import gemini_client
        return gemini_client()

    def _embed(self, texts: list[str], task: str) -> np.ndarray:
        from google.genai import errors, types

        client = self._client()
        out: list[list[float]] = []
        try:
            for i in range(0, len(texts), 100):  # API batch limit
                r = client.models.embed_content(
                    model=self.model, contents=texts[i:i + 100],
                    config=types.EmbedContentConfig(task_type=task, output_dimensionality=self.dim),
                )
                out += [e.values for e in r.embeddings]
        except errors.ClientError as e:
            raise ProviderUnavailable(*_client_error(e)) from e
        except errors.ServerError as e:
            raise ProviderUnavailable("provider_error", "The embedding service returned an error.", 502) from e
        except Exception as e:  # network failures surface as httpx errors
            raise ProviderUnavailable("provider_unreachable", "The embedding service couldn’t be reached.") from e
        return np.asarray(out, dtype="float32")

    def embed_docs(self, texts: list[str]) -> np.ndarray:
        return self._embed(texts, "RETRIEVAL_DOCUMENT")

    def embed_query(self, text: str) -> np.ndarray:
        return self._embed([text], "RETRIEVAL_QUERY")


class LocalEmbedder:
    """Local ONNX model (no key, but too heavy for serverless). pip install -r requirements-local.txt"""

    def __init__(self):
        from fastembed import TextEmbedding

        self.model = config.EMBED_MODEL
        self.impl = TextEmbedding(model_name=self.model, cache_dir=config.EMBED_CACHE)
        self.dim = 384
        self.name = f"local:{self.model}"

    def embed_docs(self, texts: list[str]) -> np.ndarray:
        return np.asarray(list(self.impl.passage_embed(texts)), dtype="float32")

    def embed_query(self, text: str) -> np.ndarray:
        return np.asarray(list(self.impl.query_embed([text])), dtype="float32")


def _client_error(e) -> tuple[str, str, int]:
    code = getattr(e, "code", 400)
    if code in (401, 403):
        return ("provider_auth", "The chat service’s key was rejected. The site owner needs to fix the server configuration.", 503)
    if code == 429:
        return ("provider_busy", "The chat service is busy right now. Please try again in a minute.", 503)
    if code == 404:
        return ("provider_model", "The configured AI model isn’t available to this key.", 503)
    return ("provider_error", "The chat service rejected the request, so no answer was generated.", 502)


@lru_cache(maxsize=1)
def get_embedder():
    return LocalEmbedder() if config.EMBED_PROVIDER == "local" else GeminiEmbedder()
