#!/bin/bash
# Cursor sessionStart wrapper: CCGS session-start + detect-gaps → additional_context
set +e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
{
  bash "$ROOT/.claude/hooks/session-start.sh" 2>/dev/null
  echo ""
  bash "$ROOT/.claude/hooks/detect-gaps.sh" 2>/dev/null
} | python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.stdin.read()[:12000]}))'
exit 0
