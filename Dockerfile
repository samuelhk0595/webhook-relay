FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM rust:1.93-bookworm AS backend
WORKDIR /build/backend
COPY backend/ ./
RUN cargo build --release --locked

FROM debian:bookworm-slim AS runtime
ARG VCS_REF=development
LABEL org.opencontainers.image.source="https://github.com/samuelhk0595/webhook-relay" \
      org.opencontainers.image.title="Webhook Relay" \
      org.opencontainers.image.revision="${VCS_REF}"
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 relay && useradd --uid 10001 --gid relay --no-create-home relay \
    && mkdir -p /data /app/admin && chown relay:relay /data
COPY --from=backend /build/backend/target/release/webhook-forwarder /usr/local/bin/webhook-forwarder
COPY --from=frontend /build/frontend/dist /app/admin
ENV LISTEN_ADDR=0.0.0.0:8080 DATABASE_PATH=/data/forwarder.db ADMIN_DIST=/app/admin COOKIE_SECURE=true
USER 10001:10001
WORKDIR /app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD curl --fail --silent http://127.0.0.1:8080/readyz || exit 1
ENTRYPOINT ["webhook-forwarder"]
