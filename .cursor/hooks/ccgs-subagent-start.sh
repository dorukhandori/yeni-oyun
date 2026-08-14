#!/bin/bash
# Cursor subagentStart → CCGS log-agent.sh
set +e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 0
INPUT=$(cat)
ADAPTED=$(printf '%s' "$INPUT" | python3 -c '
import json,sys
raw=sys.stdin.read()
try:
    d=json.loads(raw)
except Exception:
    d={}
name=d.get("agent_type") or d.get("subagent_type") or d.get("agent") or "unknown"
print(json.dumps({"agent_type": name}))
')
printf '%s' "$ADAPTED" | bash "$ROOT/.claude/hooks/log-agent.sh"
echo '{"permission":"allow"}'
exit 0
