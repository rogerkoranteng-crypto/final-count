FROM node:22-slim AS web
WORKDIR /w
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" openai python-multipart pydantic
COPY server/ ./server/
COPY --from=web /w/dist ./client/dist
ENV CLIENT_DIST=/app/client/dist PORT=8080
WORKDIR /app/server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
