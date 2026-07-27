#!/usr/bin/env bash
# Деплой erkelik одной командой: npm run deploy
#
# Что делает:
#   1) проверяет, что рабочее дерево чистое, и пушит текущую ветку;
#   2) на сервере: git pull --ff-only и docker compose up -d --build
#      (миграции применяет сам api-контейнер при старте — prisma migrate deploy).
#
# Куда деплоить — в .env.deploy рядом с корнем репо (файл не коммитится):
#   DEPLOY_HOST="user@1.2.3.4"      # ssh-адрес сервера
#   DEPLOY_PATH="/root/erkelik"     # путь к клону репо на сервере
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi
: "${DEPLOY_HOST:?Задай DEPLOY_HOST (user@host) в .env.deploy или в окружении}"
: "${DEPLOY_PATH:?Задай DEPLOY_PATH (путь к репо на сервере) в .env.deploy или в окружении}"

branch=$(git rev-parse --abbrev-ref HEAD)

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✖ Есть незакоммиченные изменения — закоммить или спрячь (git stash) перед деплоем." >&2
  exit 1
fi

echo "→ git push origin $branch"
git push origin "$branch"

echo "→ деплой на $DEPLOY_HOST:$DEPLOY_PATH (ветка $branch)"
ssh "$DEPLOY_HOST" DEPLOY_PATH="$DEPLOY_PATH" BRANCH="$branch" 'bash -s' <<'REMOTE'
set -euo pipefail
cd "$DEPLOY_PATH"

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# docker compose v2 или старый docker-compose — что есть на сервере
if docker compose version >/dev/null 2>&1; then
  dc="docker compose"
else
  dc="docker-compose"
fi

$dc up -d --build
docker image prune -f >/dev/null
echo
$dc ps
REMOTE

echo "✓ Деплой завершён"
