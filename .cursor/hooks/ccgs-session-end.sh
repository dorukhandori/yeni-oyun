#!/bin/bash
# Cursor sessionEnd / stop → CCGS session-stop.sh
set +e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
bash "$ROOT/.claude/hooks/session-stop.sh" >/dev/null 2>&1
exit 0
