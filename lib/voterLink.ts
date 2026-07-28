import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET!;

if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Never use a default secret.');
}

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// 16 bytes (128 bits) of entropy, base62-encoded, needs at most 22 characters
// to represent — pad to that length so every link is the same size.
const LINK_HASH_LENGTH = 22;

function toBase62(buffer: Buffer): string {
  let num = BigInt('0x' + buffer.toString('hex'));
  const zero = BigInt(0);
  if (num === zero) return '0';
  let result = '';
  const base = BigInt(62);
  while (num > zero) {
    result = BASE62_ALPHABET[Number(num % base)] + result;
    num /= base;
  }
  return result;
}

/**
 * Deterministic, one-way link identifier derived from a voter's token and
 * (bcrypt) password hash. Unique per voter — and since it depends on the
 * password hash, it automatically rotates (invalidating any old link)
 * whenever the password is regenerated, e.g. on resend.
 *
 * This is a lookup key, not a credential to be decoded: the server finds the
 * voter by this exact value (Voter.linkHash) rather than reversing it.
 *
 * Only the first 128 bits of the HMAC are used, base62-encoded rather than
 * hex, to keep the link short enough for SMS while still being far beyond
 * brute-force range — especially combined with the login endpoint's rate
 * limiting (10 attempts / IP / 15 min).
 */
export function generateVoterLinkHash(token: string, passwordHash: string): string {
  const digest = crypto.createHmac('sha256', SECRET).update(`${token}:${passwordHash}`).digest();
  const truncated = digest.subarray(0, 16);
  return toBase62(truncated).padStart(LINK_HASH_LENGTH, '0');
}

/**
 * Builds the bare-query-string secure voting link, e.g.
 * `https://host/election/login?3f9a1c...` — the link hash itself is the
 * entire query string, with no `key=` prefix.
 */
export function buildVoterLoginUrl(baseUrl: string, linkHash: string): string {
  return `${baseUrl}/election/login?${linkHash}`;
}
