#!/bin/bash
# Cursor afterFileEdit → CCGS validate-assets + validate-skill-change
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
p=d.get("file_path") or d.get("path") or d.get("file") or (d.get("tool_input") or {}).get("file_path") or ""
print(json.dumps({"tool_name":"Write","tool_input":{"file_path":p,"content":""}}))
')
FILE=$(printf '%s' "$INPUT" | python3 -c '
import json,sys
try:
    d=json.loads(sys.stdin.read())
except Exception:
    d={}
print(d.get("file_path") or d.get("path") or d.get("file") or (d.get("tool_input") or {}).get("file_path") or "")
')
printf '%s' "$ADAPTED" | bash "$ROOT/.claude/hooks/validate-assets.sh" >/dev/null
printf '%s' "$ADAPTED" | bash "$ROOT/.claude/hooks/validate-skill-change.sh" >/dev/null
case "$FILE" in
  *.cursor/skills/*)
    echo "=== Skill Modified (Cursor): $FILE ===" >&2
    echo "Run skill-test if this is a CCGS skill." >&2
    ;;
esac
exit 0
