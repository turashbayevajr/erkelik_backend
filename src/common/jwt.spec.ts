import { JWT_TTL_SEC, signJwt, verifyJwt } from './jwt';

const SECRET = 'test-secret';
const NOW = 1_800_000_000;

describe('jwt', () => {
  it('verifies a token it signed', () => {
    const token = signJwt('12345', SECRET, NOW);
    const payload = verifyJwt(token, SECRET, NOW + 10);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('12345');
    expect(payload?.exp).toBe(NOW + JWT_TTL_SEC);
  });

  it('rejects a token signed with another secret', () => {
    const token = signJwt('12345', 'other-secret', NOW);
    expect(verifyJwt(token, SECRET, NOW + 10)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signJwt('12345', SECRET, NOW);
    expect(verifyJwt(token, SECRET, NOW + JWT_TTL_SEC)).toBeNull();
    expect(verifyJwt(token, SECRET, NOW + JWT_TTL_SEC - 1)).not.toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = signJwt('12345', SECRET, NOW);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: '666', iat: NOW, exp: NOW + JWT_TTL_SEC }),
    ).toString('base64url');
    expect(
      verifyJwt(`${header}.${forged}.${signature}`, SECRET, NOW),
    ).toBeNull();
  });

  it('rejects alg:none and any non-canonical header', () => {
    const token = signJwt('12345', SECRET, NOW);
    const [, payload] = token.split('.');
    const noneHeader = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    expect(verifyJwt(`${noneHeader}.${payload}.`, SECRET, NOW)).toBeNull();
    // тот же JSON, но с другим порядком ключей — тоже мимо
    const reordered = Buffer.from(
      JSON.stringify({ typ: 'JWT', alg: 'HS256' }),
    ).toString('base64url');
    expect(verifyJwt(`${reordered}.${payload}.x`, SECRET, NOW)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyJwt('', SECRET, NOW)).toBeNull();
    expect(verifyJwt('a.b', SECRET, NOW)).toBeNull();
    expect(verifyJwt('a.b.c.d', SECRET, NOW)).toBeNull();
  });
});
