#!/bin/bash
ROOT=/c/Users/lungu/portal-phihau
cd "$ROOT" || exit 0

DATE=$(date '+%Y-%m-%d %H:%M')
BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)
STATUS=$(git status --short 2>/dev/null | head -20)
COMMITS=$(git log --oneline -5 2>/dev/null)

printf '# Session State\n**%s** | Branch: %s\n\n## Fisiere modificate\n```\n%s\n```\n\n## Ultimele commit-uri\n```\n%s\n```\n' \
  "$DATE" "$BRANCH" "$STATUS" "$COMMITS" > .claude/session_state.md 2>/dev/null
