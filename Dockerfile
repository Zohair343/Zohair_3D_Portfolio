# Single-service image: builds the React frontend, then serves it plus the Flask API.
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY content ./content
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production TRUST_PROXY=true \
    FRONTEND_DIST=/app/frontend/dist EMBED_CACHE=/app/backend/.model-cache
WORKDIR /app
COPY requirements.txt ./
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY content ./content
COPY backend ./backend
# The vector index rebuilds itself from content/ on first use if the committed one is stale.
COPY --from=web /app/frontend/dist ./frontend/dist
RUN useradd -m app && chown -R app /app
USER app
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "gunicorn app:app --workers 1 --threads 4 --timeout 60 --bind 0.0.0.0:${PORT:-8000}"]
