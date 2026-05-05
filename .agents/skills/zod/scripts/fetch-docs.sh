#!/bin/bash
# =============================================================
#  Zod Docs Fetcher — fetches latest Zod docs with 24h cache
#  Usage:
#    ./fetch-docs.sh                    # fetch all core pages
#    ./fetch-docs.sh migration          # fetch specific page
#    ./fetch-docs.sh api                # fetch api reference
#    ./fetch-docs.sh --fresh            # force refresh cache
# =============================================================

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$SKILL_DIR/.cache"
CACHE_TTL=86400  # 24 hours in seconds

# Zod v4 docs URLs — AI reads these at runtime
declare -A DOCS_PAGES=(
  ["migration"]="https://zod.dev/v4/changelog"
  ["api"]="https://zod.dev/api"
  ["v4"]="https://zod.dev/v4"
  ["versioning"]="https://zod.dev/v4/versioning"
  ["error-handling"]="https://zod.dev/error-handling"
)

mkdir -p "$CACHE_DIR"

# ── Cache helpers ────────────────────────────────────────────
is_cache_fresh() {
  local file="$1"
  if [ ! -f "$file" ]; then return 1; fi
  local now
  now=$(date +%s)
  local modified
  if [[ "$OSTYPE" == "darwin"* ]]; then
    modified=$(stat -f %m "$file")
  else
    modified=$(stat -c %Y "$file")
  fi
  local age=$((now - modified))
  [ "$age" -lt "$CACHE_TTL" ]
}

fetch_page() {
  local name="$1"
  local url="$2"
  local cache_file="$CACHE_DIR/${name}.md"
  local force="${3:-false}"

  if [ "$force" != "true" ] && is_cache_fresh "$cache_file"; then
    echo "✓ $name (cached)" >&2
    cat "$cache_file"
    return
  fi

  echo "⟳ Fetching $name from $url ..." >&2

  # Try curl, fallback to wget
  local content=""
  if command -v curl &>/dev/null; then
    content=$(curl -sL \
      -H "Accept: text/html,application/xhtml+xml" \
      -H "User-Agent: Mozilla/5.0 (compatible; ZodSkill/1.0)" \
      --max-time 15 \
      "$url" 2>/dev/null || echo "")
  elif command -v wget &>/dev/null; then
    content=$(wget -qO- "$url" 2>/dev/null || echo "")
  fi

  if [ -z "$content" ]; then
    echo "⚠ Failed to fetch $name — using cached version if available" >&2
    [ -f "$cache_file" ] && cat "$cache_file"
    return 1
  fi

  # Strip HTML tags for readable output — keep code blocks
  echo "$content" \
    | sed 's/<script[^>]*>.*<\/script>//gI' \
    | sed 's/<style[^>]*>.*<\/style>//gI' \
    | sed 's/<[^>]*>//g' \
    | sed '/^[[:space:]]*$/d' \
    | head -500 \
    > "$cache_file"

  echo "✅ $name fetched and cached" >&2
  cat "$cache_file"
}

# ── Main ─────────────────────────────────────────────────────
FORCE=false
PAGE=""

for arg in "$@"; do
  case "$arg" in
    --fresh) FORCE=true ;;
    *) PAGE="$arg" ;;
  esac
done

if [ -n "$PAGE" ] && [ -n "${DOCS_PAGES[$PAGE]:-}" ]; then
  # Fetch specific page
  fetch_page "$PAGE" "${DOCS_PAGES[$PAGE]}" "$FORCE"
else
  # Fetch all pages
  echo "# Zod v4 — Live Documentation" 
  echo "Fetched: $(date)"
  echo "---"
  for name in "${!DOCS_PAGES[@]}"; do
    echo ""
    echo "## $name"
    echo "Source: ${DOCS_PAGES[$name]}"
    echo ""
    fetch_page "$name" "${DOCS_PAGES[$name]}" "$FORCE" 2>/dev/null || true
    echo ""
    echo "---"
  done
fi