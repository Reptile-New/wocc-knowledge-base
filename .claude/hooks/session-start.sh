#!/bin/bash
set -euo pipefail

# Clone en lecture seule du code du jeu World of ClaudeCraft dans
# ../world-of-claudecraft, au dernier tag publié. Dépôt public externe,
# non attachable comme source de session — d'où ce hook (voir CLAUDE.md).
# Sparse : code uniquement (src, server, scripts, tests, mediawiki + racine),
# les assets (docs/, public/, ~1,4 Go d'images et de sons) sont exclus.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

GAME_URL="https://github.com/levy-street/world-of-claudecraft"
# Racine du repo déduite de l'emplacement du script lui-même : le hook reste
# lançable à la main (sessions multi-repos, où CLAUDE_PROJECT_DIR n'est pas
# la racine d'un repo et où le hook ne se déclenche pas tout seul).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$(dirname "$REPO_ROOT")/world-of-claudecraft"
SPARSE_DIRS=(src server scripts tests mediawiki)

TAG="$(git ls-remote --tags --refs "$GAME_URL" 'v*' | awk -F/ '{print $NF}' | sort -V | tail -1 || true)"
if [ -z "$TAG" ]; then
  echo "world-of-claudecraft : tags injoignables, session sans le code du jeu" >&2
  exit 0
fi

if [ -d "$DEST/.git" ]; then
  if [ "$(git -C "$DEST" describe --tags --exact-match 2>/dev/null || true)" = "$TAG" ]; then
    echo "Code du jeu déjà présent : $DEST (tag $TAG)"
    exit 0
  fi
  git -C "$DEST" fetch --depth 1 origin "refs/tags/$TAG:refs/tags/$TAG" || exit 0
  git -C "$DEST" checkout --quiet "$TAG"
else
  git -c advice.detachedHead=false clone --depth 1 --filter=blob:none --sparse --branch "$TAG" --quiet "$GAME_URL" "$DEST" || exit 0
  git -C "$DEST" sparse-checkout set "${SPARSE_DIRS[@]}"
fi

echo "Code du jeu disponible : $DEST (tag $TAG, code seul — assets exclus)"
