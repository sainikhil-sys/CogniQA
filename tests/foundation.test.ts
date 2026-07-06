import { describe, it, expect } from 'vitest';

describe('Foundation tests', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to import clientEnvSchema or load environment validation conditionally', async () => {
    process.env.SKIP_ENV_VALIDATION = 'true';
    const { env } = await import('../src/lib/env');
    expect(env).toBeDefined();
  });
});
