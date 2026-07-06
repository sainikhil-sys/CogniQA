import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Platform admin statistics. Gated by the real users.is_platform_admin flag
 * (set by an operator directly in the database) — no email heuristics, no
 * default-allow. All numbers are live table counts.
 */
export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    const { data: profile } = await supabase.from('users').select('is_platform_admin').eq('id', user.id).single();
    if (!profile?.is_platform_admin) return jsonError(403, 'Admin privileges required.');

    const admin = createAdminClient();
    const [users, repos, jobs, orgs, auditRows] = await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin.from('repositories').select('id', { count: 'exact', head: true }),
      admin.from('analysis_jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      admin.from('organizations').select('id', { count: 'exact', head: true }),
      admin.from('audit_logs').select('id, user_id, action, entity_type, metadata, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    return NextResponse.json({
      metrics: {
        total_users: users.count ?? 0,
        total_repositories: repos.count ?? 0,
        completed_analyses: jobs.count ?? 0,
        total_organizations: orgs.count ?? 0,
      },
      recent_activity: (auditRows.data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        action: row.action,
        details: `${row.entity_type}${row.metadata ? ` — ${JSON.stringify(row.metadata)}` : ''}`,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
