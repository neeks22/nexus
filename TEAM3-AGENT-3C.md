# Agent 3C: Medium Bug Fixer + Security Hardener

## Status: COMPLETE

## Changes Made

### 1. Security Headers in vercel.json
- **File:** `/Users/sayah/nexus/vercel.json`
- Added X-Content-Type-Options: nosniff
- Added X-Frame-Options: DENY
- Added X-XSS-Protection: 1; mode=block
- Added Referrer-Policy: strict-origin-when-cross-origin
- Added Permissions-Policy: camera=(), microphone=(), geolocation=()

### 2. Health Check Endpoint
- **File:** `/Users/sayah/nexus/apps/website/src/app/api/health/route.ts`
- Returns JSON with status, timestamp, and git commit SHA
- Accessible at GET /api/health

### 3. SQL Migration for CHECK Constraints
- **File:** `/Users/sayah/nexus/supabase/migrations/004_fix_check_constraints.sql`
- Fixed funnel_submissions status CHECK to include: appointment, showed, credit_app, approved, delivered
- Fixed lead_transcripts entry_type CHECK to include: form_data, completed_form, note
- Fixed lead_transcripts channel CHECK to include: funnel, crm

### 4. Phone Dedup Index
- **File:** `/Users/sayah/nexus/supabase/migrations/004_fix_check_constraints.sql` (appended)
- Added composite index idx_funnel_phone_tenant on funnel_submissions(tenant_id, phone)

## Build Verification
- Website build: PASSED (all routes compiled successfully)
