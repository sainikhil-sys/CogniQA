import crypto from 'crypto';

/**
 * AES-256-GCM encryption for third-party secrets at rest (git tokens, AI keys).
 * Requires ENCRYPTION_KEY (>= 32 chars). When it is not configured, callers
 * must refuse to store secrets and surface a real configuration error.
 */

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super('ENCRYPTION_KEY is not configured. Add a 32+ character ENCRYPTION_KEY to your environment to store integration secrets.');
    this.name = 'EncryptionNotConfiguredError';
  }
}

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new EncryptionNotConfiguredError();
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload format');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
