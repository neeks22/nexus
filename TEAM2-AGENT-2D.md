# TEAM 2 -- Agent 2D: Frontend & CRM Inbox Audit Report

**Scope:** All frontend pages (inbox, CRM, funnel, landing), CRM components, auth route
**Date:** 2026-04-01
**Status:** READ-ONLY audit -- zero code changes made

---

## CRITICAL FINDINGS

---

```
FILE: apps/website/src/app/api/auth/route.ts
LINE: 48
SEVERITY: CRITICAL
BUG: Timing-safe comparison defeated by early `===` return
EVIDENCE: if (password === expected) { const token = crypto.randomBytes(32).toString('hex'); return NextResponse.json({ authenticated: true, token }); }
FIX: Remove the line 48 `===` check entirely. Only use the timingSafeEqual path (lines 54-56). The `===` operator short-circuits on first mismatched byte, leaking password content via timing side-channel. The "fallback" timingSafeEqual on line 56 never executes for correct passwords, and only runs for wrong passwords -- which is backwards.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 26-27
SEVERITY: CRITICAL
BUG: Client-side-only auth gate using sessionStorage -- trivially spoofable
EVIDENCE: sessionStorage.setItem('inbox_auth', data.token || 'true'); ... if (sessionStorage.getItem('inbox_auth') === 'true') { setAuthed(true); }
FIX: The auth token from the server is stored but NEVER validated on subsequent loads. Line 227 checks for the literal string 'true', meaning even if a real token is returned, the fallback `|| 'true'` means any user can open DevTools, run `sessionStorage.setItem('inbox_auth', 'true')`, and access the full CRM inbox with all customer PII (names, phones, credit situations, message history). The token should be sent as an HTTP-only cookie or validated server-side on every API call.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 232-233
SEVERITY: CRITICAL
BUG: Client-side auth gate -- slightly better but still spoofable
EVIDENCE: const token = sessionStorage.getItem('readycar_auth'); if (token && token.length > 10) setAuthed(true);
FIX: Checking `token.length > 10` is marginally better than checking `=== 'true'` but still trivially bypassed -- anyone can set sessionStorage to any string > 10 chars. No server-side token validation occurs. Same fix: HTTP-only cookies or server-side session validation.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 232-233
SEVERITY: CRITICAL
BUG: Identical client-side auth spoofing vulnerability as readycar
EVIDENCE: const token = sessionStorage.getItem('readyride_auth'); if (token && token.length > 10) setAuthed(true);
FIX: Same as above. All three CRM entry points have no server-side session validation.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 674
SEVERITY: CRITICAL
BUG: XSS vulnerability -- raw SMS message body rendered without sanitization
EVIDENCE: <div className={`${styles.messageBubble} ...`}>{msg.body}</div>
FIX: SMS messages from customers are rendered directly into the DOM via React's JSX interpolation. While React escapes HTML by default (preventing basic XSS via innerHTML), the msg.body content is user-controlled SMS text that could contain malicious URLs, phishing links, or social engineering content displayed verbatim to CRM operators. However, since React's {} does auto-escape, this is NOT a traditional XSS. Downgrading sub-finding: the real risk is that message content is never sanitized for malicious links or content that could trick CRM users. Consider link detection and sandboxing.
```

**Revised severity for XSS: MEDIUM (React auto-escapes, but no link sanitization)**

---

## HIGH FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 271
SEVERITY: HIGH
BUG: Hardcoded personal phone number for lead transfer
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6133634494');
FIX: This is a real personal phone number hardcoded as the default transfer target. Should be loaded from tenant configuration or environment variable. Also exposed in client-side bundle.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 287
SEVERITY: HIGH
BUG: Different hardcoded personal phone number for ReadyRide transfer
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6139839834');
FIX: Same issue -- hardcoded PII. Should come from tenant config, not client-side code.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 287
SEVERITY: HIGH
BUG: Hardcoded phone number for ReadyCar transfer (same as inbox/dealerships)
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6133634494');
FIX: Extract to tenant configuration.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 295
SEVERITY: HIGH
BUG: No error state shown to user when conversation fetch fails
EVIDENCE: catch (err) { console.error('Failed to load conversations:', err); } finally { setLoading(false); }
FIX: When fetch fails, loading is set to false but there is no error state variable. The UI silently shows "No conversations yet" -- indistinguishable from a network failure. Add an `error` state and display a retry prompt.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 103
SEVERITY: HIGH
BUG: Empty catch block swallowing CRM activity fetch errors
EVIDENCE: } catch { /* activity fetch is optional */ }
FIX: At minimum log the error. Silent failures make debugging impossible when activity data stops loading.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 138
SEVERITY: HIGH
BUG: Empty catch block on SMS send failure
EVIDENCE: } catch { alert('Failed to send SMS'); }
FIX: The catch block shows an alert but does not log the error. The actual error (network failure, auth failure, rate limit) is lost. Should log err to console.error at minimum.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 153
SEVERITY: HIGH
BUG: Empty catch block on email send
EVIDENCE: } catch { alert('Failed to open email'); }
FIX: Same pattern -- error is caught but not logged.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 168
SEVERITY: HIGH
BUG: Status update error swallowed
EVIDENCE: } catch { console.error('Failed to update status'); }
FIX: The actual error object is not passed to console.error. Should be `catch (err) { console.error('Failed to update status:', err); }` so the root cause is visible.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 202-204
SEVERITY: HIGH
BUG: Resume AI error swallowed with empty catch
EVIDENCE: } catch { console.error('Failed to resume AI'); }
FIX: Same pattern -- no error object logged.
```

---

## MEDIUM FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 1-737
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (737 lines) -- monolithic component
EVIDENCE: 737 lines containing PasswordGate, InboxContent, helpers, SVG icons all in one file
FIX: Split into: PasswordGate component, InboxContent component, helper utilities, SVG icon components. Per project rules, files exceeding 500 lines should be split before adding more code.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 1-922
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (922 lines) -- massive monolithic component
EVIDENCE: 922 lines -- nearly identical to readyride/page.tsx
FIX: Extract shared inbox logic into a reusable component. ReadyCar and ReadyRide pages are 95%+ identical code with only TENANT and transferPhone differing.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 1-921
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (921 lines) -- near-duplicate of readycar/page.tsx
EVIDENCE: 921 lines, nearly identical to readycar/page.tsx
FIX: Same as above. These two files should be ONE component parameterized by tenant.
```

```
FILE: apps/website/src/app/apply/dealerships/page.tsx
LINE: 1-1084
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (1084 lines) -- largest file in the frontend
EVIDENCE: 1084 lines containing all 7 funnel steps, animations, validation, styles
FIX: Extract each step into its own component. Extract shared styles into a styles module. Extract helpers into a utils file.
```

```
FILE: apps/website/src/app/dealerships/page.tsx
LINE: 1-770
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (770 lines)
EVIDENCE: 770-line landing page with all sections inline
FIX: Extract sections (Hero, Products, HowItWorks, Pricing, etc.) into separate components.
```

```
FILE: apps/website/src/app/dealerships/page.tsx
LINE: 22
SEVERITY: MEDIUM
BUG: Hardcoded phone number that may be fake/placeholder
EVIDENCE: <a href="tel:+16139001234" className={styles.navPhone}> ... (613) 900-1234
FIX: Verify this is a real business number. If placeholder, it should come from config. Currently hardcoded in two places (desktop and mobile).
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 210-433
SEVERITY: MEDIUM
BUG: Entire component rendered with inline styles -- hundreds of hardcoded color values
EVIDENCE: background: '#12121f', color: '#f0f0f5', color: '#8888a0', background: '#10b981', color: '#ef4444', background: 'rgba(239,68,68,0.12)', color: '#666', etc.
FIX: Replace all inline styles with CSS module classes or Tailwind classes using CSS variables/design tokens. There are 50+ hardcoded hex colors in this single file.
```

```
FILE: apps/website/src/components/crm/CRMLayout.tsx
LINE: 68-165
SEVERITY: MEDIUM
BUG: Entire layout built with inline styles and hardcoded colors
EVIDENCE: background: '#0a0a0f', background: '#0d0d14', color: '#f0f0f5', color: '#8888a0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', etc.
FIX: Extract to CSS module with design tokens. At least 20 hardcoded hex colors.
```

```
FILE: apps/website/src/components/crm/KanbanBoard.tsx
LINE: 65-136
SEVERITY: MEDIUM
BUG: Entire Kanban board uses inline styles with hardcoded colors
EVIDENCE: background: 'rgba(255,255,255,0.02)', color: '#f0f0f5', color: '#8888a0', etc.
FIX: Same -- extract to CSS module.
```

```
FILE: apps/website/src/components/crm/LeadsTab.tsx
LINE: 279-283
SEVERITY: MEDIUM
BUG: Shared inputStyle object with hardcoded colors
EVIDENCE: const inputStyle: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', ... };
FIX: Should use CSS variables from a design system.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 48-50
SEVERITY: MEDIUM
BUG: useEffect missing dependency -- will not refetch when tenant/phone changes
EVIDENCE: useEffect(() => { fetchData(); }, [tenant, phone]);
FIX: The `fetchData` function is not in the dependency array, and `tenant`/`phone` are listed but ESLint may not catch that `fetchData` closes over them. This works but is fragile. Better to include `fetchData` as dependency or use inline async.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 648-650
SEVERITY: MEDIUM
BUG: Client-side "hot lead" detection using regex against message body -- fragile and duplicated
EVIDENCE: const hotKeywords = /\b(yes|yeah|interested|ready|come in|test drive|appointment|schedule|book|buy|approved|check|let.s do it|sign me up|i.m in|deal|trade.?in|license|permis|drivers? licen[cs]e)\b/i; const isHot = conv.messages.some((m: Message) => m.direction === 'inbound' && hotKeywords.test(m.body));
FIX: This duplicates server-side hot lead detection logic. It is also duplicated between the conversation list (line 648) and the compose area (line 855). Should be a shared utility function, ideally driven by server-side status rather than client-side regex.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 418
SEVERITY: MEDIUM
BUG: Empty catch block when saving archived phones to sessionStorage
EVIDENCE: try { sessionStorage.setItem('archived_readyride', JSON.stringify(Array.from(next))); } catch {}
FIX: Should at minimum log the error. SessionStorage can fail in private browsing or when quota is exceeded.
```

---

## LOW FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 10
SEVERITY: LOW
BUG: TENANT hardcoded to 'readycar' -- this is the OLD inbox page, likely dead code
EVIDENCE: const TENANT = 'readycar';
FIX: This file at /inbox/dealerships/ appears to be the original inbox before the CRM was built. The readycar CRM now lives at /readycar/page.tsx. Verify if this page is still linked anywhere or if it can be removed.
```

```
FILE: apps/website/src/app/inbox/page.tsx
LINE: 4
SEVERITY: LOW
BUG: Redirects to /inbox/dealerships which may be a dead/legacy page
EVIDENCE: redirect('/inbox/dealerships');
FIX: Verify this redirect target is still the intended destination. The main CRM pages are now at /readycar and /readyride.
```

```
FILE: apps/website/src/app/apply/dealerships/layout.tsx
LINE: 5
SEVERITY: LOW
BUG: Metadata title says "Nexus Auto" -- should be the dealership brand name
EVIDENCE: title: 'Get Pre-Qualified | Nexus Auto',
FIX: Should dynamically show the tenant's brand (ReadyCar, ReadyRide) rather than "Nexus Auto" which is the agency name, not the customer-facing brand.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 54
SEVERITY: LOW
BUG: Dead variable -- SUPABASE_URL assigned but never used
EVIDENCE: const SUPABASE_URL = '/api/dashboard'; // reuse to get supabase URL indirectly
FIX: Remove the unused variable.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 489-495
SEVERITY: LOW
BUG: Search input missing ARIA label
EVIDENCE: <input type="text" className={styles.searchInput} placeholder="Search by name or phone..." ... />
FIX: Add aria-label="Search conversations" for screen reader accessibility.
```

```
FILE: apps/website/src/components/crm/CRMLayout.tsx
LINE: 106-126
SEVERITY: LOW
BUG: Tab buttons missing ARIA attributes
EVIDENCE: <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={...}> {tab.label} </button>
FIX: Add role="tab", aria-selected={activeTab === tab.id}, and wrap in a role="tablist" container. The tab panel should have role="tabpanel".
```

```
FILE: apps/website/src/components/crm/KanbanBoard.tsx
LINE: 116-130
SEVERITY: LOW
BUG: Drag-and-drop cards have no keyboard accessibility
EVIDENCE: SortableContext with LeadCard components -- no keyboard instructions or ARIA live regions
FIX: Add aria-label to draggable cards, announce drag operations via aria-live region.
```

```
FILE: apps/website/src/components/crm/LeadsTab.tsx
LINE: 248-249
SEVERITY: LOW
BUG: Mouse hover effect using direct style manipulation instead of CSS
EVIDENCE: onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
FIX: Use CSS :hover pseudo-class instead of JavaScript event handlers for hover effects.
```

```
FILE: apps/website/src/app/readycar/page.tsx + readyride/page.tsx
LINE: Multiple
SEVERITY: LOW
BUG: Massive code duplication -- readycar and readyride pages are 95%+ identical
EVIDENCE: Both files are ~920 lines with identical PasswordGate, types, helpers, InboxContent, SVG icons. Only differences: TENANT constant, transferPhone default, sessionStorage key, and ReadyRide has a "New Message" button + hot lead regex highlighting.
FIX: Create a shared TenantInbox component that accepts tenant config as props. Current duplication means any bug fix must be applied in 3 places (inbox/dealerships, readycar, readyride).
```

---

## SUMMARY TABLE

| Severity | Count | Key Issues |
|----------|-------|-----------|
| CRITICAL | 4 | Auth bypass via sessionStorage spoofing (3 pages), timing-safe comparison defeated |
| HIGH | 8 | Hardcoded phone numbers, empty catch blocks, no error states on fetches |
| MEDIUM | 13 | Files over 500 lines (5 files), hundreds of inline hardcoded colors, code duplication |
| LOW | 9 | Dead code, missing ARIA labels, dead links, placeholder values |

## TOP 3 PRIORITIES

1. **Auth is theater.** All three CRM pages can be accessed by setting a sessionStorage key. There is zero server-side session validation. Any person who opens DevTools can access all customer PII, SMS history, credit situations, and can send SMS messages to any phone number on behalf of the dealership. This is the single most important fix.

2. **Code duplication is a maintenance bomb.** readycar/page.tsx, readyride/page.tsx, and inbox/dealerships/page.tsx are 95%+ identical (~2,580 lines of near-duplicate code). Any fix must be applied in 3 places. Extract a shared TenantInbox component.

3. **Inline styles with hardcoded colors everywhere.** The CRM components have 100+ hardcoded hex colors across LeadDetailPanel, CRMLayout, KanbanBoard, LeadsTab. A design token system or CSS variables would make theming and maintenance possible.
