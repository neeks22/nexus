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
