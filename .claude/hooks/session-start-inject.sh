#!/bin/bash
ROOT=/c/Users/lungu/portal-phihau
cd "$ROOT" 2>/dev/null || { echo '{}'; exit 0; }

CONTEXT=""

if [ -f ".claude/session_state.md" ]; then
  CONTEXT=$(cat ".claude/session_state.md")
fi

if [ -f "docs/IN_PROGRESS.md" ]; then
  MANUAL=$(cat "docs/IN_PROGRESS.md")
  CONTEXT="${CONTEXT}"$'\n\n---\n## Note manuale (IN_PROGRESS.md)\n'"${MANUAL}"
fi

if [ -n "$CONTEXT" ]; then
  node -e "
    const ctx = process.argv[1];
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: '## Stare proiect din sesiunea anterioara:\n' + ctx + '\n'
      }
    }));
  " "$CONTEXT" 2>/dev/null || echo '{}'
else
  echo '{}'
fi
