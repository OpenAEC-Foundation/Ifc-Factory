import { randomUUID } from 'node:crypto';

const BASE64_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

export function generateIfcGuid(): string {
  const uuid = randomUUID().replace(/-/g, '');
  const bytes = Buffer.from(uuid, 'hex');
  return uint8ArrayToBase64(bytes).slice(0, 22);
}

function uint8ArrayToBase64(bytes: Buffer): string {
  let result = '';
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < len ? bytes[i + 1]! : 0;
    const b2 = i + 2 < len ? bytes[i + 2]! : 0;

    result += BASE64_CHARS[(b0 >> 2) & 0x3f];
    result += BASE64_CHARS[((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0f)];
    if (i + 1 < len) {
      result += BASE64_CHARS[((b1 & 0x0f) << 2) | ((b2 >> 6) & 0x03)];
    }
    if (i + 2 < len) {
      result += BASE64_CHARS[b2 & 0x3f];
    }
  }

  return result;
}

export function isValidIfcGuid(guid: string): boolean {
  if (guid.length !== 22) return false;
  for (const ch of guid) {
    if (!BASE64_CHARS.includes(ch)) return false;
  }
  return true;
}
