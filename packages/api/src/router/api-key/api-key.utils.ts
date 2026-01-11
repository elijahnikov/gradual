import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "grdl_";
const KEY_LENGTH = 32;
const PREFIX_DISPLAY_LENGTH = 8;

// generate a new API key
export function generateApiKey(): string {
  const randomPart = randomBytes(KEY_LENGTH)
    .toString("base64url") // URL-safe base64
    .slice(0, KEY_LENGTH); // Ensure exact length

  return `${API_KEY_PREFIX}${randomPart}`;
}

// hash an API key using SHA-256
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// extract the display prefix from an API key
export function extractKeyPrefix(key: string): string {
  if (key.startsWith(API_KEY_PREFIX)) {
    const randomPart = key.slice(API_KEY_PREFIX.length);
    return `${API_KEY_PREFIX}${randomPart.slice(0, PREFIX_DISPLAY_LENGTH)}`;
  }
  return key.slice(0, API_KEY_PREFIX.length + PREFIX_DISPLAY_LENGTH);
}

// validate the format of an API key
export function validateApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return false;
  }
  const expectedLength = API_KEY_PREFIX.length + KEY_LENGTH;
  return key.length === expectedLength;
}

// format an API key for display
export function formatKeyForDisplay(keyPrefix: string): string {
  return `${keyPrefix}...`;
}

// verify an API key against a hash
export function verifyApiKey(key: string, hash: string): boolean {
  const keyHash = hashApiKey(key);
  return keyHash === hash;
}
