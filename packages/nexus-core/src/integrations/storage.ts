// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  StorageIntegration — Local FS (full), S3 / Supabase (stubbed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { classifyError } from '../healing/error-taxonomy.js';
import type { ErrorClassification } from '../types.js';

// ── Config ─────────────────────────────────────────

export interface StorageConfig {
  provider: 'local' | 's3' | 'supabase';
  bucket?: string;
  region?: string;
  apiKey?: string;
  baseUrl?: string; // for Supabase project URL (e.g. https://xyz.supabase.co)
  baseDir?: string; // for local provider — defaults to ./nexus-storage
}

// ── NexusStorageError ──────────────────────────────

export class NexusStorageError extends Error {
  readonly classification: ErrorClassification;
  readonly originalError: unknown;

  constructor(message: string, classification: ErrorClassification, originalError: unknown) {
    super(message);
    this.name = 'NexusStorageError';
    this.classification = classification;
    this.originalError = originalError;
  }
}

function buildNexusStorageError(raw: unknown, context: string): NexusStorageError {
  const classification = classifyError(raw);
  const message =
    raw instanceof Error
      ? `${context}: ${raw.message}`
      : `${context}: ${String(raw)}`;
  return new NexusStorageError(message, classification, raw);
}

// ── Local provider helpers ─────────────────────────

function resolveLocalPath(baseDir: string, key: string): string {
  // Prevent path traversal — strip any leading slashes and ".." components.
  const safe = key
    .split('/')
    .filter((part) => part !== '..' && part !== '.' && part.trim() !== '')
    .join('/');
  return join(baseDir, safe);
}

async function localUpload(
  baseDir: string,
  key: string,
  data: string | Buffer,
): Promise<{ url: string }> {
  const filePath = resolveLocalPath(baseDir, key);

  try {
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  } catch (err) {
    throw buildNexusStorageError(err, `Local upload failed for key "${key}"`);
  }

  return { url: `file://${filePath}` };
}

async function localDownload(baseDir: string, key: string): Promise<string> {
  const filePath = resolveLocalPath(baseDir, key);

  try {
    const buf = await fs.readFile(filePath);
    return buf.toString('utf8');
  } catch (err) {
    throw buildNexusStorageError(err, `Local download failed for key "${key}"`);
  }
}

async function localList(baseDir: string, prefix?: string): Promise<string[]> {
  const searchDir = prefix
    ? resolveLocalPath(baseDir, prefix)
    : baseDir;

  // Ensure base dir exists before listing.
  try {
    await fs.mkdir(baseDir, { recursive: true });
  } catch {
    // Ignore if already exists.
  }

  // Check whether searchDir exists; return [] if not.
  try {
    await fs.access(searchDir);
  } catch {
    return [];
  }

  async function walk(dir: string): Promise<string[]> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      throw buildNexusStorageError(err, `Local list failed for dir "${dir}"`);
    }

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await walk(fullPath);
        files.push(...nested);
      } else {
        // Return path relative to baseDir, using forward slashes.
        const relative = fullPath.slice(baseDir.length).replace(/\\/g, '/').replace(/^\//, '');
        files.push(relative);
      }
    }
    return files;
  }

  const all = await walk(searchDir);

  // If a prefix was provided filter to only files that start with the prefix.
  if (prefix) {
    const normalizedPrefix = prefix.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
    return all.filter((f) => f.startsWith(normalizedPrefix));
  }

  return all;
}

async function localDelete(baseDir: string, key: string): Promise<void> {
  const filePath = resolveLocalPath(baseDir, key);

  try {
    await fs.unlink(filePath);
  } catch (err) {
    // ENOENT (file not found) is treated as a no-op — idempotent delete.
    if (
      typeof err === 'object' &&
      err !== null &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return;
    }
    throw buildNexusStorageError(err, `Local delete failed for key "${key}"`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  StorageIntegration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class StorageIntegration {
  private readonly config: StorageConfig;
  private readonly baseDir: string;

  constructor(config: StorageConfig) {
    this.config = config;
    this.baseDir = config.baseDir ?? './nexus-storage';
  }

  // ── upload ────────────────────────────────────────

  async upload(key: string, data: string | Buffer): Promise<{ url: string }> {
    switch (this.config.provider) {
      case 'local':
        return localUpload(this.baseDir, key, data);

      case 's3':
        // Stub — install @aws-sdk/client-s3 and replace with:
        //   const client = new S3Client({ region: this.config.region });
        //   await client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: data }));
        //   return { url: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}` };
        return {
          url: `https://${this.config.bucket ?? 'bucket'}.s3.${this.config.region ?? 'us-east-1'}.amazonaws.com/${key}`,
        };

      case 'supabase':
        // Stub — install @supabase/supabase-js and replace with:
        //   const supabase = createClient(this.config.baseUrl!, this.config.apiKey!);
        //   await supabase.storage.from(this.config.bucket!).upload(key, data);
        //   const { data: urlData } = supabase.storage.from(this.config.bucket!).getPublicUrl(key);
        //   return { url: urlData.publicUrl };
        return {
          url: `${this.config.baseUrl ?? 'https://project.supabase.co'}/storage/v1/object/public/${this.config.bucket ?? 'bucket'}/${key}`,
        };

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusStorageError(
          `Unknown storage provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── download ──────────────────────────────────────

  async download(key: string): Promise<string> {
    switch (this.config.provider) {
      case 'local':
        return localDownload(this.baseDir, key);

      case 's3':
        // Stub — install @aws-sdk/client-s3 and replace with GetObjectCommand.
        throw new NexusStorageError(
          'S3 download not yet implemented — install @aws-sdk/client-s3',
          classifyError(new Error('server_error: not implemented')),
          null,
        );

      case 'supabase':
        // Stub — install @supabase/supabase-js and replace with supabase.storage.from().download().
        throw new NexusStorageError(
          'Supabase download not yet implemented — install @supabase/supabase-js',
          classifyError(new Error('server_error: not implemented')),
          null,
        );

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusStorageError(
          `Unknown storage provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── list ──────────────────────────────────────────

  async list(prefix?: string): Promise<string[]> {
    switch (this.config.provider) {
      case 'local':
        return localList(this.baseDir, prefix);

      case 's3':
        // Stub — install @aws-sdk/client-s3 and replace with ListObjectsV2Command.
        return [];

      case 'supabase':
        // Stub — install @supabase/supabase-js and replace with supabase.storage.from().list().
        return [];

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusStorageError(
          `Unknown storage provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }

  // ── delete ────────────────────────────────────────

  async delete(key: string): Promise<void> {
    switch (this.config.provider) {
      case 'local':
        return localDelete(this.baseDir, key);

      case 's3':
        // Stub — install @aws-sdk/client-s3 and replace with DeleteObjectCommand.
        return;

      case 'supabase':
        // Stub — install @supabase/supabase-js and replace with supabase.storage.from().remove().
        return;

      default: {
        const _exhaustive: never = this.config.provider;
        throw new NexusStorageError(
          `Unknown storage provider: ${String(_exhaustive)}`,
          classifyError(new Error('server_error: unknown provider')),
          null,
        );
      }
    }
  }
}
