import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { User } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) return jsonError(err.status, err.message);
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error({ err: message }, 'API route error');
  return jsonError(500, message);
}

/** Authenticated request context: cookie-based Supabase session (RLS enforced). */
export async function requireUser(): Promise<{ supabase: Client; user: User }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, 'Authentication required.');
  return { supabase, user };
}

/**
 * Resolve the caller's organization and default project. Repositories in the
 * schema belong to projects, which belong to organizations.
 */
export async function requireOrgContext(supabase: Client, userId: string): Promise<{ orgId: string; projectId: string }> {
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) throw new ApiError(500, memberError.message);
  if (!membership) throw new ApiError(400, 'No organization found for this account. Create an organization first.');

  const orgId = membership.organization_id;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (projectError) throw new ApiError(500, projectError.message);
  if (project) return { orgId, projectId: project.id };

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({ organization_id: orgId, name: 'Default Project', description: 'Automatically created workspace project' })
    .select('id')
    .single();

  if (createError || !created) throw new ApiError(500, createError?.message ?? 'Could not create default project');
  return { orgId, projectId: created.id };
}

/** Write an audit log entry (best effort — failures are logged, not thrown). */
export async function writeAudit(
  supabase: Client,
  entry: { orgId: string; userId: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    organization_id: entry.orgId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    metadata: (entry.metadata ?? null) as never,
  });
  if (error) logger.warn({ error: error.message, action: entry.action }, 'Audit log write failed');
}

/** Record real AI token usage against the organization. */
export async function recordTokenUsage(supabase: Client, orgId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const { error } = await supabase.from('usage_records').insert({ organization_id: orgId, metric: 'tokens', quantity: tokens });
  if (error) logger.warn({ error: error.message }, 'Usage record write failed');
}

// ---------------------------------------------------------------------------
// In-memory fixed-window rate limiter (per user, per route). Suitable for a
// single-node deployment; swap for a Redis-backed limiter when scaling out.
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new ApiError(429, 'Rate limit exceeded. Please retry shortly.');
  }
}
