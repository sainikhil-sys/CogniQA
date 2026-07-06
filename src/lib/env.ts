import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL').default('http://localhost:3000'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('NEXT_PUBLIC_SENTRY_DSN must be a valid URL').optional().or(z.literal('')),
});

/**
 * Server-side variables.
 *
 * Only the Supabase service key is hard-required. Integration credentials
 * (AI, payments, email, encryption) are OPTIONAL: when absent, the related
 * feature surfaces an explicit "not configured" state in the product.
 * Features NEVER fall back to simulated behaviour when a credential is missing.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required'),

  // Secrets encryption (required to store third-party tokens at rest)
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // AI providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional().or(z.literal('')),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const isServer = typeof window === 'undefined';

function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NEXT_PHASE === 'phase-production-build') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  }

  const clientData = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  };

  const clientResult = clientSchema.safeParse(clientData);
  if (!clientResult.success) {
    console.error('❌ Invalid client-side environment variables:');
    console.error(JSON.stringify(clientResult.error.format(), null, 2));
    throw new Error('Invalid environment variables');
  }

  if (!isServer) {
    return { ...clientResult.data } as z.infer<typeof clientSchema>;
  }

  const serverData = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };

  const serverResult = serverSchema.safeParse(serverData);
  if (!serverResult.success) {
    console.error('❌ Invalid server-side environment variables:');
    const formattedErrors = serverResult.error.format();
    console.error(JSON.stringify(formattedErrors, null, 2));

    const missing = Object.entries(formattedErrors)
      .filter(([key]) => key !== '_errors')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([key, val]) => `${key}: ${(val as any)._errors?.join(', ')}`);

    throw new Error(`Invalid server environment configuration:\n- ${missing.join('\n- ')}`);
  }

  return { ...clientResult.data, ...serverResult.data };
}

export const env = validateEnv();

/**
 * Feature gates derived from real configuration. Consumers surface an
 * explicit "not configured" state when a gate is closed — never fake output.
 */
export const features = {
  openai: (): boolean => Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')),
  razorpay: (): boolean => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  resend: (): boolean => Boolean(process.env.RESEND_API_KEY),
  encryption: (): boolean => Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32),
};
