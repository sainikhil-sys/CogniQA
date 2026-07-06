import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();

    // RLS: the select returns null unless the user's org owns the repo.
    const { data: repo } = await supabase.from('repositories').select('id, repo_name').eq('id', id).maybeSingle();
    if (!repo) return jsonError(404, 'Repository not found in workspace.');

    const { error } = await supabase.from('repositories').delete().eq('id', id);
    if (error) return jsonError(500, error.message);

    const { orgId } = await requireOrgContext(supabase, user.id);
    await writeAudit(supabase, { orgId, userId: user.id, action: 'repository_deleted', entityType: 'repository', entityId: id, metadata: { name: repo.repo_name } });

    return NextResponse.json({ message: 'Repository index deleted successfully' });
  } catch (err) {
    return handleRouteError(err);
  }
}
