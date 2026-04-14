#!/bin/bash
MAX_ITERATIONS=${1:-50}
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  RALPH DEALERSHIP BUILD — ITERATION $ITERATION / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  claude --print -p "
Read PRD-dealership.md and progress-dealership.txt.
Find the next unchecked item in the PRD.
Implement it fully — working code, not stubs. Write tests. Verify tests pass.
Use the Activix CRM API docs at docs/research/activix-crm-integration-research.md for API reference.
Update progress-dealership.txt with what you completed and any issues encountered.
Check off the completed item in PRD-dealership.md.
Commit your changes with a descriptive git message.
If ALL items are complete, output exactly: <promise>COMPLETE</promise>
If stuck after 3 attempts on one item, document the blocker in progress-dealership.txt and move to next item.
" 2>&1 | tee -a ralph-dealership-output.log

  if grep -q "<promise>COMPLETE</promise>" ralph-dealership-output.log; then
    echo ""
    echo "━━━ ALL DEALERSHIP PRD ITEMS COMPLETE ━━━"
    echo "Total iterations: $ITERATION"
    exit 0
  fi
done
echo ""
echo "━━━ Hit max iterations ($MAX_ITERATIONS). Check progress-dealership.txt for status. ━━━"
