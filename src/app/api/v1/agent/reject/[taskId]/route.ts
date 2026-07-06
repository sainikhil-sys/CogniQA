import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

export async function POST(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const { supabase, user } = await requireUser();

    const { data: task } = await supabase.from('agent_tasks').select('id').eq('id', taskId).eq('user_id', user.id).maybeSingle();
    if (!task) return jsonError(404, 'Agent task not found.');

    const { error } = await supabase.from('agent_tasks').update({ status: 'Rejected', error_message: 'Rejected by user' }).eq('id', taskId);
    if (error) return jsonError(500, error.message);

    const { orgId } = await requireOrgContext(supabase, user.id);
    await writeAudit(supabase, { orgId, userId: user.id, action: 'agent_task_rejected', entityType: 'agent_task', entityId: taskId });

    return NextResponse.json({ message: 'Task rejected.', task_id: taskId });
  } catch (err) {
    return handleRouteError(err);
  }
}
