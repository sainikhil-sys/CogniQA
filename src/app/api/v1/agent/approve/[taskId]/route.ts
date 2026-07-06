import { NextResponse } from 'next/server';
import { requireUser, requireOrgContext, handleRouteError, jsonError, writeAudit } from '@/lib/api/context';

/**
 * Marks the AI-generated change set as approved by the user. Pushing the
 * branch, opening a pull request, and deploying are NOT implemented yet —
 * they are surfaced as "Coming Soon" in the console instead of simulated.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const { supabase, user } = await requireUser();

    const { data: task } = await supabase.from('agent_tasks').select('id, status, repo_id').eq('id', taskId).eq('user_id', user.id).maybeSingle();
    if (!task) return jsonError(404, 'Agent task not found.');
    if (task.status !== 'PendingApproval') return jsonError(400, `Task is in state ${task.status}, cannot approve.`);

    const { error } = await supabase.from('agent_tasks').update({ status: 'Approved' }).eq('id', taskId);
    if (error) return jsonError(500, error.message);

    const { orgId } = await requireOrgContext(supabase, user.id);
    await writeAudit(supabase, { orgId, userId: user.id, action: 'agent_task_approved', entityType: 'agent_task', entityId: taskId });

    return NextResponse.json({
      message: 'Change set approved. Apply the diff locally — automated PR creation and deployment are coming soon.',
      task_id: taskId,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
