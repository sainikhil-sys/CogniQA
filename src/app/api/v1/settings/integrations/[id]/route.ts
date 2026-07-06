import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    const { orgId } = await requireOrgContext(supabase, user.id);

    const { data: connection } = await supabase.from('git_connections').select('id').eq('id', id).eq('organization_id', orgId).maybeSingle();
    if (!connection) return jsonError(404, 'Integration not found.');

    const { error } = await supabase
      .from('git_connections')
      .update({ encrypted_oauth_token: null, github_app_installation_id: null })
      .eq('id', id);
    if (error) return jsonError(500, error.message);

    await writeAudit(supabase, { orgId, userId: user.id, action: 'integration_disconnected', entityType: 'git_connection', entityId: id });
    return NextResponse.json({ message: 'Integration disconnected successfully' });
  } catch (err) {
    return handleRouteError(err);
  }
}
