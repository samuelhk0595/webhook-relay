#!/usr/bin/env bash
# Run on the VPS from /opt/webhook-relay/incoming/<sha>/release.sh <sha>.
set -Eeuo pipefail
umask 077

SHA="${1:?Usage: release.sh <40-character commit SHA>}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { printf 'Invalid commit SHA\n' >&2; exit 2; }
ROOT="${DEPLOY_ROOT:-/opt/webhook-relay}"
BUNDLE="$ROOT/incoming/$SHA"
[[ -d "$ROOT" && -f "$ROOT/.env" && -f "$ROOT/secrets/bootstrap_password.txt" ]] || {
  printf 'Provision .env and bootstrap secret before deployment\n' >&2; exit 2;
}
exec 9>"$ROOT/deploy.lock"
flock -n 9 || { printf 'Another deployment owns the release lock\n' >&2; exit 2; }
cd "$BUNDLE"
sha256sum --check image.tar.gz.sha256
gzip -dc image.tar.gz | docker load
REVISION="$(docker image inspect "webhook-relay:$SHA" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
[[ "$REVISION" == "$SHA" ]] || { printf 'Image revision does not match requested commit\n' >&2; exit 2; }

mkdir -p "$ROOT/backups" "$ROOT/releases/$SHA"
if [[ -f "$ROOT/compose.yaml" && -f "$ROOT/current.env" ]]; then
  OLD_TAG="$(sed -n 's/^IMAGE_TAG=//p' "$ROOT/current.env")"
  OLD_CONTAINER="$(IMAGE_TAG="$OLD_TAG" docker compose --project-directory "$ROOT" --env-file "$ROOT/.env" -f "$ROOT/compose.yaml" ps -q app)"
  if [[ -n "$OLD_CONTAINER" ]] && [[ "$(docker inspect "$OLD_CONTAINER" --format '{{.State.Running}}')" == true ]]; then
    BACKUP="predeploy-$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:12}.db"
    docker exec "$OLD_CONTAINER" webhook-forwarder backup "/data/$BACKUP"
    docker cp "$OLD_CONTAINER:/data/$BACKUP" "$ROOT/backups/$BACKUP"
    test -s "$ROOT/backups/$BACKUP"
    docker exec "$OLD_CONTAINER" rm -f "/data/$BACKUP"
    printf 'Pre-deploy SQLite snapshot saved: backups/%s\n' "$BACKUP"
  fi
  cp "$ROOT/current.env" "$ROOT/previous.env"
  cp "$ROOT/compose.yaml" "$ROOT/previous-compose.yaml"
fi

cp compose.production.yaml "$ROOT/releases/$SHA/compose.yaml"
cp release.sh "$ROOT/releases/$SHA/release.sh"
cp compose.production.yaml "$ROOT/compose.yaml"
export IMAGE_TAG="$SHA"
compose=(docker compose --project-directory "$ROOT" --env-file "$ROOT/.env" -f "$ROOT/compose.yaml")
"${compose[@]}" config --quiet
if ! "${compose[@]}" up -d --wait --wait-timeout 90; then
  "${compose[@]}" logs --tail 50 app >&2
  printf 'Deployment failed. Previous image/config and DB backup were retained. Check migration compatibility before rollback.\n' >&2
  exit 1
fi
"${compose[@]}" exec -T app curl --fail --silent http://127.0.0.1:8080/readyz
printf 'IMAGE_TAG=%s\n' "$SHA" > "$ROOT/current.env.tmp"
mv "$ROOT/current.env.tmp" "$ROOT/current.env"
printf '%s\n' "$SHA" > "$ROOT/current.sha"
# Loaded images and release metadata stay available. Remove only this transport archive.
rm -f "$BUNDLE/image.tar.gz" "$BUNDLE/image.tar.gz.sha256"
printf 'Webhook Relay deployed: %s\n' "$SHA"
