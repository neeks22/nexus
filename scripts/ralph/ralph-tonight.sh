#!/bin/bash
MAX_ITERATIONS=${1:-20}
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  RALPH TONIGHT SPRINT — ITERATION $ITERATION / $MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  claude --print -p "
Read PRD-tonight.md.
Find the next unchecked item.
Implement it fully — real content, not placeholders.
For the sales deck: write actual slide content with real stats from our research docs in docs/research/ and docs/agency/.
For the prospect list: actually search the web for Ottawa dealerships.
For outreach emails: write real emails using our dealership-one-pager.md as reference.
For lead quality: write a real playbook using our subprime-auto-dealer-ad-research.md.
Check off the completed item in PRD-tonight.md.
Commit your changes with a descriptive git message.
If ALL items are complete, output exactly: <promise>COMPLETE</promise>
If stuck after 3 attempts on one item, move to next item.
" 2>&1 | tee -a ralph-tonight-output.log

  if grep -q "<promise>COMPLETE</promise>" ralph-tonight-output.log; then
    echo ""
    echo "━━━ TONIGHT SPRINT COMPLETE ━━━"
    echo "Total iterations: $ITERATION"
    exit 0
  fi
done
echo ""
echo "━━━ Hit max iterations ($MAX_ITERATIONS). ━━━"
