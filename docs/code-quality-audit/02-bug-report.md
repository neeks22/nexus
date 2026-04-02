# Nexus Bug Report — 66 Bugs Found

## CRITICAL (10) — Fix immediately

1. Hardcoded Gmail password in check-email/route.ts:16
2. Hardcoded Anthropic API key fallback in check-email/route.ts:19
3. Hardcoded Slack webhook URL in check-email/route.ts:20
4. Hardcoded password fallbacks in auth/route.ts:10-11
5. Hardcoded cron secret fallback in check-email/route.ts:21
6. Hardcoded process secret fallback in sms/process/route.ts:12 and sms/route.ts:41
7. Personal phone numbers in client JS (readycar:289, readyride:288)
8. SessionStorage auth check bypasses token validation (readycar:231, readyride:231)

## HIGH (18) — Fix this week

9. Error details leaked to client (check-email:138)
10. `as Type` assertions without runtime validation (8 files)
11. No auth on credit-analyze endpoint
12. No rate limiting on credit-analyze endpoint
13. No rate limiting on auth endpoint (brute force)
14. check-email doesn't use shared security module
15. Session token not stored/validated server-side
16. No auth on messages GET endpoint
17. Missing null check on data.message after send (readycar/readyride:370)
18. Unhandled failed API response in DashboardTab:26-30
19. Optimistic update without rollback in PipelineTab:42-57
20. Missing useEffect dependency in LeadDetailPanel:47-48
21. Timeline sort uses formatted strings instead of timestamps
22. crypto.timingSafeEqual crash on length mismatch (security.ts:97)
23. CORS origin bypass via substring match (security.ts:110,119)
24. Tenant validation defaults to readycar instead of failing (security.ts:166)
25. supaAnonHeaders falls back to service key (security.ts:46)
26. CSRF bypass when both origin and referer missing (middleware.ts:32-42)

## MEDIUM (22) — Fix soon

27-48. [Type assertions, empty catch blocks, dead code, code duplication, etc.]

## LOW (16)

49-66. [Style issues, unused variables, minor validation gaps]
