# Multi-User Login System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shared tenant passwords with per-user email+password login, add a `/login` page and `/dashboard` tenant picker page.

**Architecture:** Extend the existing HMAC-signed session system (proven, production-tested) with a `crm_users` table in Supabase. Users log in with email+password, verified against scrypt-hashed passwords stored in the DB. Session cookie payload expands to include user_id, email, name, tenant_id, and role. Staff land on `/dashboard` showing their tenant(s), admins see all tenants. No new auth libraries — leverage existing custom auth which already handles timing-safe comparison, rate limiting, CSRF, and HttpOnly cookies.

**Tech Stack:** Next.js 14, TypeScript, Supabase (REST API via existing helpers), Node.js `crypto.scrypt` for password hashing, existing HMAC session signing.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/006_crm_users.sql` | Users table + RLS policies |
| Create | `apps/website/src/app/login/page.tsx` | Login page (email + password form) |
| Create | `apps/website/src/app/login/page.module.css` | Login page styles |
| Create | `apps/website/src/app/dashboard/page.tsx` | Tenant picker dashboard |
| Create | `apps/website/src/app/dashboard/layout.tsx` | Dashboard layout (hide marketing nav) |
| Create | `apps/website/src/app/dashboard/page.module.css` | Dashboard styles |
| Create | `apps/website/src/lib/auth.ts` | Password hashing + user lookup helpers |
| Modify | `apps/website/src/app/api/auth/route.ts` | Email+password auth instead of shared passwords |
| Modify | `apps/website/src/middleware.ts` | New session format, redirect to /login, protect /dashboard |
| Modify | `apps/website/src/app/readycar/page.tsx` | Remove PasswordGate, auth handled by middleware |
| Modify | `apps/website/src/app/readyride/page.tsx` | Remove PasswordGate, auth handled by middleware |
| Create | `apps/website/src/app/api/auth/users/route.ts` | Admin endpoint to create/list users |

---

### Task 1: Database Migration — crm_users Table

**Files:**
- Create: `supabase/migrations/006_crm_users.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 006_crm_users.sql
-- Per-user authentication for CRM multi-tenant access

CREATE TABLE IF NOT EXISTS crm_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for login lookups
CREATE INDEX idx_crm_users_email ON crm_users (email);
CREATE INDEX idx_crm_users_tenant ON crm_users (tenant_id);

-- RLS
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY crm_users_service_all ON crm_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_users_updated_at
  BEFORE UPDATE ON crm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_users_updated_at();
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase MCP `execute_sql` tool or:
```bash
# Copy the SQL content and run against production Supabase
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sayah/nexus
git add supabase/migrations/006_crm_users.sql
git commit -m "feat: add crm_users table for per-user authentication"
```

---

### Task 2: Auth Helpers — Password Hashing & User Lookup

**Files:**
- Create: `apps/website/src/lib/auth.ts`

- [ ] **Step 1: Create the auth helper module**

```typescript
import crypto from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY } from './security';

/* ---------- Password Hashing (scrypt — no external deps) ---------- */

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(`${salt}:${derivedKey.toString('hex')}`);
      }
    );
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, derivedKey) => {
        if (err) reject(err);
        else {
          const keyBuf = Buffer.from(key, 'hex');
          const derivedBuf = derivedKey;
          if (keyBuf.length !== derivedBuf.length) {
            resolve(false);
            return;
          }
          resolve(crypto.timingSafeEqual(keyBuf, derivedBuf));
        }
      }
    );
  });
}

/* ---------- User Lookup ---------- */

export interface CRMUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  tenant_id: string;
  role: 'admin' | 'manager' | 'staff';
  is_active: boolean;
}

export async function findUserByEmail(email: string): Promise<CRMUser | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_users?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=id,email,password_hash,name,tenant_id,role,is_active`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) {
      console.error(`[auth] User lookup failed: HTTP ${res.status}`);
      return null;
    }
    const users = (await res.json()) as CRMUser[];
    return users[0] ?? null;
  } catch (err) {
    console.error('[auth] User lookup error:', err instanceof Error ? err.message : 'unknown');
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/lib/auth.ts
git commit -m "feat: add auth helpers for password hashing and user lookup"
```

---

### Task 3: Update Auth API — Email + Password Login

**Files:**
- Modify: `apps/website/src/app/api/auth/route.ts`

- [ ] **Step 1: Rewrite the POST handler for email+password**

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/security';
import { findUserByEmail, verifyPassword } from '@/lib/auth';

/* =============================================================================
   AUTH API — Per-user email+password authentication
   Verifies credentials against crm_users table, sets signed session cookie.
   ============================================================================= */

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = (cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.CSRF_SECRET) || '').trim();

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    console.error('[auth] AUTH_SECRET not configured — cannot create sessions');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(ip, 5)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  try {
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch (err) {
      console.error('[auth] Body parse error:', err instanceof Error ? err.message : 'unknown');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Build signed session token
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenant_id,
      role: user.role,
      exp: Date.now() + 86400000, // 24h
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = signPayload(payloadB64);
    const token = `${payloadB64}.${signature}`;

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set('nexus_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400,
    });
    return response;
  } catch (err) {
    console.error('[auth] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}

/** GET /api/auth — check session and return user info */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_SECRET) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }

  const sessionCookie = request.cookies.get('nexus_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dotIdx = sessionCookie.indexOf('.');
  if (dotIdx === -1) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payloadB64 = sessionCookie.substring(0, dotIdx);
  const signature = sessionCookie.substring(dotIdx + 1);
  const expectedSig = signPayload(payloadB64);

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.delete('nexus_session');
    return res;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) {
      const res = NextResponse.json({ authenticated: false, reason: 'expired' }, { status: 401 });
      res.cookies.delete('nexus_session');
      return res;
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.user_id,
        email: payload.email,
        name: payload.name,
        tenant_id: payload.tenant_id,
        role: payload.role,
      },
    });
  } catch (err) {
    console.error('[auth] Session decode error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/** DELETE /api/auth — logout */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('nexus_session');
  return response;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/app/api/auth/route.ts
git commit -m "feat: auth API now uses per-user email+password from crm_users"
```

---

### Task 4: Update Middleware — New Session Format + Login Redirect

**Files:**
- Modify: `apps/website/src/middleware.ts`

- [ ] **Step 1: Update the session payload interface and protected paths**

In `middleware.ts`, replace the `SessionPayload` interface and `PROTECTED_PAGE_PATHS`:

```typescript
// OLD:
interface SessionPayload {
  tenant: string;
  exp: number;
}

// NEW:
interface SessionPayload {
  user_id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
  exp: number;
}
```

```typescript
// OLD:
const PROTECTED_PAGE_PATHS = ['/inbox', '/readycar', '/readyride'];

// NEW:
const PROTECTED_PAGE_PATHS = ['/inbox', '/readycar', '/readyride', '/dashboard'];
```

- [ ] **Step 2: Update the `unauthorizedResponse` function to redirect to /login**

```typescript
// OLD:
function unauthorizedResponse(path: string, request: NextRequest, message: string = 'Unauthorized'): NextResponse {
  if (isProtectedApiRoute(path)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const res = NextResponse.redirect(new URL('/inbox', request.url));
  res.cookies.delete('nexus_session');
  return res;
}

// NEW:
function unauthorizedResponse(path: string, request: NextRequest, message: string = 'Unauthorized'): NextResponse {
  if (isProtectedApiRoute(path)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.delete('nexus_session');
  return res;
}
```

- [ ] **Step 3: Update the session verification block for new payload + tenant access control**

Replace the entire CRM session verification block (the `if (isProtectedRoute(path))` block) with:

```typescript
  // ----- CRM session verification for protected routes -----
  if (isProtectedRoute(path)) {
    if (!AUTH_SECRET) {
      return isProtectedApiRoute(path)
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url));
    }

    const sessionCookie = request.cookies.get('nexus_session')?.value;

    if (!sessionCookie) {
      if (isProtectedApiRoute(path)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await verifySession(sessionCookie);
    if (!session) {
      return unauthorizedResponse(path, request, 'Invalid or expired session');
    }

    // Tenant scope check: staff/manager can only access their own tenant
    // Admin (role='admin') can access any tenant
    const sessionTenant = session.tenant_id;
    const sessionRole = session.role;

    if (sessionRole !== 'admin') {
      if (path.startsWith('/readycar') && sessionTenant !== 'readycar') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (path.startsWith('/readyride') && sessionTenant !== 'readyride') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    verifiedTenant = sessionTenant;

    // For admin accessing a specific tenant path, use that tenant for RLS
    if (sessionRole === 'admin') {
      if (path.startsWith('/readycar')) verifiedTenant = 'readycar';
      else if (path.startsWith('/readyride')) verifiedTenant = 'readyride';
    }
  }
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/middleware.ts
git commit -m "feat: middleware uses new user session format, redirects to /login"
```

---

### Task 5: Login Page

**Files:**
- Create: `apps/website/src/app/login/page.tsx`
- Create: `apps/website/src/app/login/page.module.css`

- [ ] **Step 1: Create login page styles**

```css
/* page.module.css */
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  font-family: Inter, system-ui, sans-serif;
  padding: 20px;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  backdrop-filter: blur(20px);
}

.logoMark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 22px;
  margin: 0 auto 16px;
}

.title {
  color: #f0f0f5;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  text-align: center;
}

.subtitle {
  color: #8888a0;
  font-size: 14px;
  margin: 0 0 32px;
  text-align: center;
}

.label {
  display: block;
  color: #8888a0;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #f0f0f5;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus {
  border-color: #6366f1;
}

.inputError {
  border-color: #ef4444;
}

.fieldGroup {
  margin-bottom: 20px;
}

.error {
  color: #ef4444;
  font-size: 13px;
  margin: -12px 0 16px;
  text-align: center;
}

.button {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.button:hover {
  opacity: 0.9;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Create login page component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          router.replace('/dashboard');
        }
      } catch {
        // Not authenticated — stay on login
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Wait a minute.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.authenticated) {
        router.replace('/dashboard');
      } else {
        setError('Invalid email or password');
        setPassword('');
      }
    } catch (err) {
      console.error('[login] Error:', err instanceof Error ? err.message : 'unknown');
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.logoMark}>N</div>
        </div>
        <h1 className={styles.title}>Nexus CRM</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            placeholder="you@dealership.ca"
            autoFocus
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/app/login/
git commit -m "feat: add /login page with email+password form"
```

---

### Task 6: Dashboard Page — Tenant Picker

**Files:**
- Create: `apps/website/src/app/dashboard/page.tsx`
- Create: `apps/website/src/app/dashboard/layout.tsx`
- Create: `apps/website/src/app/dashboard/page.module.css`

- [ ] **Step 1: Create dashboard layout (hides marketing nav)**

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus CRM — Dashboard',
  robots: 'noindex, nofollow',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`header, footer { display: none !important; }`}</style>
      {children}
    </>
  );
}
```

- [ ] **Step 2: Create dashboard styles**

```css
/* page.module.css */
.container {
  min-height: 100vh;
  background: #0a0a0f;
  font-family: Inter, system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.logoMark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 26px;
  margin-bottom: 16px;
}

.greeting {
  color: #f0f0f5;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
}

.subtitle {
  color: #8888a0;
  font-size: 15px;
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 700px;
}

.tenantCard {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: block;
}

.tenantCard:hover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
  transform: translateY(-2px);
}

.tenantIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 18px;
  margin-bottom: 16px;
}

.tenantName {
  color: #f0f0f5;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.tenantLocation {
  color: #8888a0;
  font-size: 13px;
  margin: 0;
}

.logoutBtn {
  margin-top: 48px;
  padding: 10px 24px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: #8888a0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.logoutBtn:hover {
  color: #ef4444;
  border-color: #ef4444;
}

.loading {
  color: #8888a0;
  font-size: 15px;
  text-align: center;
  padding: 60px 0;
}
```

- [ ] **Step 3: Create dashboard page component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: string;
}

const TENANTS: Record<string, { name: string; location: string }> = {
  readycar: { name: 'ReadyCar', location: 'Stittsville, ON' },
  readyride: { name: 'ReadyRide', location: 'Gloucester, ON' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (!data.authenticated) {
          router.replace('/login');
          return;
        }
        setUser(data.user);
      } catch (err) {
        console.error('[dashboard] Session check error:', err instanceof Error ? err.message : 'unknown');
        router.replace('/login');
      }
      setLoading(false);
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/login');
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.loading}>Loading...</p></div>;
  }

  if (!user) return null;

  // Admin sees all tenants, staff/manager sees only their own
  const visibleTenants = user.role === 'admin'
    ? Object.entries(TENANTS)
    : Object.entries(TENANTS).filter(([id]) => id === user.tenant_id);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoMark}>N</div>
        <h1 className={styles.greeting}>Welcome, {user.name.split(' ')[0]}</h1>
        <p className={styles.subtitle}>Select a dealership to manage</p>
      </div>

      <div className={styles.grid}>
        {visibleTenants.map(([tenantId, tenant]) => (
          <Link key={tenantId} href={`/${tenantId}`} className={styles.tenantCard}>
            <div className={styles.tenantIcon}>{tenant.name[0]}</div>
            <h2 className={styles.tenantName}>{tenant.name}</h2>
            <p className={styles.tenantLocation}>{tenant.location}</p>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className={styles.logoutBtn}>
        Sign Out
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/app/dashboard/
git commit -m "feat: add /dashboard tenant picker page"
```

---

### Task 7: Remove PasswordGate from CRM Pages

**Files:**
- Modify: `apps/website/src/app/readycar/page.tsx`
- Modify: `apps/website/src/app/readyride/page.tsx`

- [ ] **Step 1: Simplify readycar/page.tsx — remove PasswordGate and auth check**

Remove the entire `PasswordGate` component (lines ~14-100) and the auth state management. The page should render the CRM directly since middleware now handles auth:

Replace the auth-gating logic at the top of the default export. Remove:
- `const [authed, setAuthed] = useState(false);`
- The `useEffect` that calls `GET /api/auth`
- The `if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;`
- The entire `PasswordGate` function

The page should directly return `<InboxPage />` (or whatever the main CRM component is).

The remaining page structure becomes:

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './page.module.css';
import CreditRouter from '../../components/CreditRouter';
import CRMLayout from '../../components/crm/CRMLayout';

const TENANT = 'readycar';

// InboxContent and InboxPage remain unchanged — just remove PasswordGate wrapper

export default function ReadyCarPage() {
  return <InboxPage />;
}
```

- [ ] **Step 2: Apply the same removal to readyride/page.tsx**

Same pattern — remove `PasswordGate`, remove auth state, render CRM directly.

- [ ] **Step 3: Verify build**

```bash
cd /Users/sayah/nexus/apps/website
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/app/readycar/page.tsx apps/website/src/app/readyride/page.tsx
git commit -m "feat: remove PasswordGate from CRM pages, auth now via /login"
```

---

### Task 8: Admin API — Create Users + Seed Initial Accounts

**Files:**
- Create: `apps/website/src/app/api/auth/users/route.ts`

- [ ] **Step 1: Create user management API endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY, rateLimit, getClientIp } from '@/lib/security';
import { hashPassword } from '@/lib/auth';

function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  return val.replace(/\\n$/g, '').replace(/\n$/g, '').trim();
}

const AUTH_SECRET = (cleanEnv(process.env.AUTH_SECRET) || cleanEnv(process.env.CSRF_SECRET) || '').trim();

function verifyAdminSession(request: NextRequest): { role: string; tenant_id: string } | null {
  const sessionCookie = request.cookies.get('nexus_session')?.value;
  if (!sessionCookie || !AUTH_SECRET) return null;

  const dotIdx = sessionCookie.indexOf('.');
  if (dotIdx === -1) return null;

  const payloadB64 = sessionCookie.substring(0, dotIdx);
  const signature = sessionCookie.substring(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.role !== 'admin') return null;
    return { role: payload.role, tenant_id: payload.tenant_id };
  } catch {
    return null;
  }
}

/** POST /api/auth/users — create a new CRM user (admin only) */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = verifyAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (await rateLimit(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, password, name, tenant_id, role } = body as {
      email?: string;
      password?: string;
      name?: string;
      tenant_id?: string;
      role?: string;
    };

    if (!email || !password || !name || !tenant_id) {
      return NextResponse.json({ error: 'Missing required fields: email, password, name, tenant_id' }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'staff'];
    const userRole = role && validRoles.includes(role) ? role : 'staff';

    const passwordHash = await hashPassword(password);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name,
        tenant_id,
        role: userRole,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (errText.includes('duplicate key')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      console.error(`[users] Create failed: HTTP ${res.status}: ${errText}`);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, user: { id: created[0]?.id, email, name, tenant_id, role: userRole } }, { status: 201 });
  } catch (err) {
    console.error('[users] POST error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** GET /api/auth/users — list CRM users (admin only) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = verifyAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_users?select=id,email,name,tenant_id,role,is_active,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`[users] List failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const users = await res.json();
    return NextResponse.json({ users });
  } catch (err) {
    console.error('[users] GET error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sayah/nexus
git add apps/website/src/app/api/auth/users/route.ts
git commit -m "feat: add admin user management API endpoint"
```

---

### Task 9: Seed Initial Users

This task creates the initial user accounts. Must be done AFTER the migration (Task 1) and auth helpers (Task 2) are deployed.

- [ ] **Step 1: Create seed script to generate password hashes**

Create a temporary Node.js script to hash passwords and insert users:

```bash
cd /Users/sayah/nexus
node -e "
const crypto = require('crypto');

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(salt + ':' + key.toString('hex'));
    });
  });
}

async function main() {
  // Nico — admin (all tenants)
  const nicoHash = await hashPassword('REPLACE_WITH_NICO_PASSWORD');
  // ReadyCar staff account
  const readycarHash = await hashPassword('REPLACE_WITH_READYCAR_PASSWORD');
  // ReadyRide staff account
  const readyrideHash = await hashPassword('REPLACE_WITH_READYRIDE_PASSWORD');

  console.log('-- Run these INSERT statements via Supabase SQL editor or MCP --');
  console.log();
  console.log(\`INSERT INTO crm_users (email, password_hash, name, tenant_id, role) VALUES\`);
  console.log(\`  ('nico@nexusagents.ca', '\${nicoHash}', 'Nico', 'readycar', 'admin'),\`);
  console.log(\`  ('readycar@nexusagents.ca', '\${readycarHash}', 'ReadyCar Staff', 'readycar', 'manager'),\`);
  console.log(\`  ('readyride@nexusagents.ca', '\${readyrideHash}', 'ReadyRide Staff', 'readyride', 'manager');\`);
}

main();
"
```

**IMPORTANT:** The user (Nico) will be prompted here to provide the actual passwords for each account before running this script.

- [ ] **Step 2: Run the INSERT statements via Supabase MCP**

Use `execute_sql` with the generated INSERT statements.

- [ ] **Step 3: Verify users exist**

```sql
SELECT id, email, name, tenant_id, role, is_active FROM crm_users;
```

---

### Task 10: Build, Test, Deploy

- [ ] **Step 1: Run build**

```bash
cd /Users/sayah/nexus/apps/website
npm run build
```

Fix any type errors or build failures.

- [ ] **Step 2: Test login flow locally (if dev server available)**

1. Go to `/login` — should see email+password form
2. Enter seeded credentials — should redirect to `/dashboard`
3. Dashboard shows tenant card(s) — click one → goes to CRM
4. Try accessing `/readycar` directly without session — should redirect to `/login`
5. Logout button works — clears session, returns to `/login`

- [ ] **Step 3: Commit final state**

```bash
cd /Users/sayah/nexus
git add -A
git commit -m "feat: complete multi-user login system with dashboard tenant picker"
```

- [ ] **Step 4: Deploy to production**

```bash
cd /Users/sayah/nexus
git push origin main
```

Or deploy via Vercel MCP.

- [ ] **Step 5: Prompt user to confirm deployment and provide passwords for seeding**
