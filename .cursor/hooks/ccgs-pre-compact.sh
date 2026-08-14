#!/bin/bash
# Cursor preCompact → CCGS pre-compact.sh
set +e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
cat | bash "$ROOT/.claude/hooks/pre-compact.sh"
exit 0
