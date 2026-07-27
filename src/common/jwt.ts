import { createHmac, timingSafeEqual } from 'crypto';

// Минимальный самописный HS256 JWT для входа вне Telegram.
// Принимается ровно один заголовок {alg:HS256,typ:JWT} — сравнение
// base64url-сегмента строкой, поэтому подмена `alg: none` не проходит.

export const JWT_TTL_SEC = 7 * 24 * 60 * 60;

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

const HEADER_SEGMENT = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

function signature(signingInput: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(signingInput).digest();
}

export function signJwt(
  sub: string,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
  ttlSec: number = JWT_TTL_SEC,
): string {
  const payload: JwtPayload = { sub, iat: nowSec, exp: nowSec + ttlSec };
  const signingInput = `${HEADER_SEGMENT}.${b64url(JSON.stringify(payload))}`;
  return `${signingInput}.${signature(signingInput, secret).toString('base64url')}`;
}

export function verifyJwt(
  token: string,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): JwtPayload | null {
  if (!token || !secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payloadSegment, signatureSegment] = parts;

  if (header !== HEADER_SEGMENT) return null;

  const expected = signature(`${header}.${payloadSegment}`, secret);
  let actual: Buffer;
  try {
    actual = Buffer.from(signatureSegment, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString());
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const { sub, iat, exp } = payload as Partial<JwtPayload>;
  if (typeof sub !== 'string' || sub.length === 0) return null;
  if (typeof iat !== 'number' || typeof exp !== 'number') return null;
  if (exp <= nowSec) return null;

  return { sub, iat, exp };
}
