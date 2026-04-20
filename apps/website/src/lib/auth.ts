import crypto from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY } from './security';

/* ---------- Password Hashing (scrypt — no external deps) ----------

   New hashes: `v2$<N>:<salt>:<key>` (OWASP-recommended N=131072)
   Legacy hashes: `<salt>:<key>` (N=16384) — still verified for backward-compat
*/

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST_V2 = 131072;
const SCRYPT_COST_LEGACY = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_MAXMEM = 256 * 1024 * 1024; // 256MB — required for N=131072 (default 32MB is too small)

function scryptAsync(password: string, salt: string, N: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEYLEN,
      { N, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION, maxmem: SCRYPT_MAXMEM },
      (err, derivedKey) => err ? reject(err) : resolve(derivedKey)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, SCRYPT_COST_V2);
  return `v2$${SCRYPT_COST_V2}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  let N: number;
  let salt: string;
  let key: string;

  if (hash.startsWith('v2$')) {
    const [nPart, saltPart, keyPart] = hash.slice(3).split(':');
    N = parseInt(nPart, 10);
    if (!Number.isFinite(N) || N < 1024 || N > 2 ** 22) return false;
    salt = saltPart;
    key = keyPart;
  } else {
    [salt, key] = hash.split(':');
    N = SCRYPT_COST_LEGACY;
  }
  if (!salt || !key) return false;

  const derivedKey = await scryptAsync(password, salt, N);
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedKey);
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
