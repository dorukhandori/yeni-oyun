#!/bin/bash
# Cursor subagentStop → CCGS log-agent-stop.sh
set +e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
cat | bash "$ROOT/.claude/hooks/log-agent-stop.sh"
exit 0
