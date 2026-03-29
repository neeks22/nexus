#!/bin/bash
MAX_ITERATIONS=${1:-25}
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  RALPH SECURITY FIXES — ITERATION $ITERATION / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  claude --print -p "
Read PRD-security-fixes.md and progress-security-fixes.txt.
Find the next unchecked item in the PRD.
Implement it fully — working code, not stubs. Write tests if applicable. Verify tests pass with npx vitest run.
Update progress-security-fixes.txt with what you completed and any issues encountered.
Check off the completed item in PRD-security-fixes.md.
Commit your changes with a descriptive git message.
If ALL items are complete, output exactly: <promise>COMPLETE</promise>
If stuck after 3 attempts on one item, document the blocker in progress-security-fixes.txt and move to next item.
" 2>&1 | tee -a ralph-security-output.log

  if grep -q "<promise>COMPLETE</promise>" ralph-security-output.log; then
    echo ""
    echo "━━━ ALL SECURITY FIXES COMPLETE ━━━"
    echo "Total iterations: $ITERATION"
    exit 0
  fi
done
echo ""
echo "━━━ Hit max iterations ($MAX_ITERATIONS). Check progress-security-fixes.txt for status. ━━━"
