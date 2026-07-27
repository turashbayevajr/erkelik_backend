import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('verifies a correct password', () => {
    const stored = hashPassword('azhar');
    expect(verifyPassword('azhar', stored)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const stored = hashPassword('azhar');
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  it('produces a unique salt per hash', () => {
    expect(hashPassword('azhar')).not.toBe(hashPassword('azhar'));
  });

  it('rejects malformed stored values', () => {
    expect(verifyPassword('azhar', '')).toBe(false);
    expect(verifyPassword('azhar', 'plaintext')).toBe(false);
    expect(verifyPassword('azhar', 'md5:aa:bb')).toBe(false);
    expect(verifyPassword('azhar', 'scrypt:zz:zz')).toBe(false);
  });
});
