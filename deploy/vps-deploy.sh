#!/usr/bin/env bash
# Pull-deploy of Blaue Stunde on Daniel's VPS (D-87): /opt/blauestunde/deploy.sh, run every minute
# by blauestunde-deploy.timer. When origin/main has a new commit, builds it with
# deploy/build-dist.mjs and copies the package to the web root; a failed build changes nothing.
# The launch package (indexable) while /opt/blauestunde/LAUNCH exists, otherwise staging.
# Log: /opt/blauestunde/deploy.log; last build output: /opt/blauestunde/last-build.log.
set -euo pipefail
BASE=/opt/blauestunde
REPO=$BASE/repo
WEBROOT=/var/www/blauestunde.media/public
BRANCH=main

exec 9>"$BASE/deploy.lock"
flock -n 9 || exit 0
log() { echo "$(date -Is) $*" >> "$BASE/deploy.log"; }

cd "$REPO"
git fetch -q origin "$BRANCH"
COMMIT=$(git rev-parse "origin/$BRANCH")
MODE=staging; ARGS=()
if [ -f "$BASE/LAUNCH" ]; then MODE=launch; ARGS=(--launch); fi
STATE="$COMMIT $MODE"
# done already, or failed already (a new commit or a mode change tries again)
[ "$STATE" = "$(cat "$BASE/deployed" 2>/dev/null || true)" ] && exit 0
[ "$STATE" = "$(cat "$BASE/failed" 2>/dev/null || true)" ] && exit 0

git checkout -q --force --detach "$COMMIT"
if [ ! -f deploy/build-dist.mjs ]; then
  log "${COMMIT:0:7} $MODE: no deploy/build-dist.mjs on $BRANCH, nothing deployed"
  echo "$STATE" > "$BASE/failed"; exit 0
fi
if node deploy/build-dist.mjs "${ARGS[@]}" --out "$BASE/dist" > "$BASE/last-build.log" 2>&1; then
  # -c: unchanged files keep their time, so browsers' cached copies stay valid
  rsync -rlc --delete --chmod=D755,F644 "$BASE/dist/" "$WEBROOT/"
  echo "$STATE" > "$BASE/deployed"
  log "${COMMIT:0:7} $MODE: deployed ($(tail -2 "$BASE/last-build.log" | head -1))"
else
  echo "$STATE" > "$BASE/failed"
  log "${COMMIT:0:7} $MODE: build failed, nothing deployed (see last-build.log)"
fi
