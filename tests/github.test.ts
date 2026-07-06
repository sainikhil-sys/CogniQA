import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Encryption Tests ----
describe('Encryption', () => {
  beforeEach(() => {
    // Set a valid 64-char hex key for testing
    process.env.ENCRYPTION_KEY =
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  });

  it('encrypts and decrypts correctly', async () => {
    const { encrypt, decrypt } = await import('@/lib/encryption');
    const plaintext = 'ghp_testtoken1234567890';
    const encrypted = encrypt(plaintext);
    
    // Encrypted value should be base64
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);
    
    // Decryption should recover the original
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const { encrypt } = await import('@/lib/encryption');
    const plaintext = 'ghp_token_same_input';
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2); // Different IVs
  });

  it('throws on invalid encrypted data', async () => {
    const { decrypt } = await import('@/lib/encryption');
    expect(() => decrypt('short')).toThrow();
    expect(() => decrypt('invalidbase64')).toThrow();
  });

  it('throws when ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY;
    // Need a fresh import to pick up the env change
    vi.resetModules();
    const { encrypt } = await import('@/lib/encryption');
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
  });
});

// ---- GitProvider Interface Conformance ----
describe('GitHubAdapter interface', () => {
  it('implements all required GitProvider methods', async () => {
    const { GitHubAdapter } = await import('@/lib/git/github');
    const adapter = new GitHubAdapter('fake-token');

    // Check all required methods exist
    expect(typeof adapter.listRepos).toBe('function');
    expect(typeof adapter.getTree).toBe('function');
    expect(typeof adapter.getFile).toBe('function');
    expect(typeof adapter.listBranches).toBe('function');
    expect(typeof adapter.listCommits).toBe('function');
    expect(typeof adapter.listPRs).toBe('function');
    expect(typeof adapter.listIssues).toBe('function');
    expect(typeof adapter.createReview).toBe('function');
    expect(typeof adapter.getRepo).toBe('function');
    expect(typeof adapter.revokeAccess).toBe('function');
  });
});

// ---- Zod Schema Validation ----
describe('Repo Schemas', () => {
  it('validates importRepositorySchema correctly', async () => {
    const { importRepositorySchema } = await import(
      '@/features/repos/schemas'
    );

    // Valid input
    const valid = importRepositorySchema.parse({
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      repoFullName: 'owner/repo',
      repoName: 'repo',
      repoUrl: 'https://github.com/owner/repo',
      defaultBranch: 'main',
    });
    expect(valid.organizationId).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(valid.repoFullName).toBe('owner/repo');

    // Invalid org ID
    expect(() =>
      importRepositorySchema.parse({
        organizationId: 'not-a-uuid',
        repoFullName: 'owner/repo',
        repoName: 'repo',
        repoUrl: 'https://github.com/owner/repo',
      })
    ).toThrow();
  });

  it('validates disconnectGitHubSchema correctly', async () => {
    const { disconnectGitHubSchema } = await import(
      '@/features/repos/schemas'
    );

    const valid = disconnectGitHubSchema.parse({
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(valid.organizationId).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );

    expect(() =>
      disconnectGitHubSchema.parse({
        organizationId: '',
      })
    ).toThrow();
  });
});

// ---- Permission check tests ----
describe('Permission checks', () => {
  it('checkOrgPermission rejects invalid inputs', async () => {
    const { checkOrgPermission } = await import(
      '@/features/auth/permissions'
    );

    // Empty userId
    const result1 = await checkOrgPermission('', 'org-id');
    expect(result1.hasPermission).toBe(false);

    // Empty orgId
    const result2 = await checkOrgPermission('user-id', '');
    expect(result2.hasPermission).toBe(false);
  });
});
