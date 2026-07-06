import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL').default('http://localhost:3000'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('NEXT_PUBLIC_SENTRY_DSN must be a valid URL').optional().or(z.literal('')),
});

const serverSchema = z.object({
  // Supabase Service Role Key
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required'),
  
  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),

  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1, 'INNGEST_EVENT_KEY is required'),
  INNGEST_SIGNING_KEY: z.string().min(1, 'INNGEST_SIGNING_KEY is required'),

  // Resend
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_STARTER_PRICE_ID: z.string().min(1, 'STRIPE_STARTER_PRICE_ID is required'),
  STRIPE_PRO_PRICE_ID: z.string().min(1, 'STRIPE_PRO_PRICE_ID is required'),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1, 'STRIPE_ENTERPRISE_PRICE_ID is required'),

  // OAuth
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),

  // Encryption Key
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters long for AES-256-GCM'),

  // Optional AI Provider Keys
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional().or(z.literal('')),
});

const isServer = typeof window === 'undefined';

function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NEXT_PHASE === 'phase-production-build') {
    // Return empty/mocked values of the expected type to avoid runtime errors during build compilation
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

  // Handle service role key aliased as SUPABASE_SECRET_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  const serverData = {
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
    STRIPE_ENTERPRISE_PRICE_ID: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  };

  const serverResult = serverSchema.safeParse(serverData);
  if (!serverResult.success) {
    console.error('❌ Invalid server-side environment variables:');
    const formattedErrors = serverResult.error.format();
    console.error(JSON.stringify(formattedErrors, null, 2));
    
    // Detailed output of what's missing
    const missing = Object.entries(formattedErrors)
      .filter(([key]) => key !== '_errors')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([key, val]) => `${key}: ${(val as any)._errors?.join(', ')}`);
    
    throw new Error(`Invalid server environment configuration:\n- ${missing.join('\n- ')}`);
  }

  return { ...clientResult.data, ...serverResult.data };
}

export const env = validateEnv();
