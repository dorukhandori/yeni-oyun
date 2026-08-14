#!/bin/bash
# Cursor beforeShellExecution → CCGS validate-commit + validate-push
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
cmd=d.get("command") or (d.get("tool_input") or {}).get("command") or ""
print(json.dumps({"tool_name":"Bash","tool_input":{"command":cmd}}))
')
OUT=$(mktemp)
ERR=$(mktemp)
printf '%s' "$ADAPTED" | bash "$ROOT/.claude/hooks/validate-commit.sh" >"$OUT" 2>"$ERR"
CODE=$?
if [ "$CODE" -eq 2 ]; then
  MSG=$(cat "$ERR" "$OUT")
  python3 -c 'import json,sys; m=sys.argv[1][:4000]; print(json.dumps({"permission":"deny","user_message":m,"agent_message":m}))' "$MSG"
  rm -f "$OUT" "$ERR"
  exit 2
fi
printf '%s' "$ADAPTED" | bash "$ROOT/.claude/hooks/validate-push.sh" >>"$OUT" 2>>"$ERR"
CODE=$?
rm -f "$OUT" "$ERR"
if [ "$CODE" -eq 2 ]; then
  echo '{"permission":"deny","agent_message":"CCGS validate-push blocked this command."}'
  exit 2
fi
echo '{"permission":"allow"}'
exit 0
