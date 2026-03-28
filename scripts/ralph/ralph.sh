#!/bin/bash
MAX_ITERATIONS=${1:-25}
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "━━━━━━━���━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  RALPH ITERATION $ITERATION / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  claude --print -p "
Read PRD.md and progress.txt.
Find the next unchecked item in the PRD.
Implement it fully — working code, not stubs. Write tests. Verify tests pass.
Update progress.txt with what you completed and any issues encountered.
Check off the completed item in PRD.md.
Commit your changes with a descriptive git message.
If ALL items are complete, output exactly: <promise>COMPLETE</promise>
If stuck after 3 attempts on one item, document the blocker in progress.txt and move to next item.
" 2>&1 | tee -a ralph-output.log

  if grep -q "<promise>COMPLETE</promise>" ralph-output.log; then
    echo ""
    echo "━━━ ALL PRD ITEMS COMPLETE ━━━"
    echo "Total iterations: $ITERATION"
    exit 0
  fi
done
echo ""
echo "━━━ Hit max iterations ($MAX_ITERATIONS). Check progress.txt for status. ━━━"
