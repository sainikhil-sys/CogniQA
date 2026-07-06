import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const { supabase, user } = await requireUser();

    const { data: task, error } = await supabase.from('agent_tasks').select('*').eq('id', taskId).eq('user_id', user.id).maybeSingle();
    if (error) return jsonError(500, error.message);
    if (!task) return jsonError(404, 'Agent task not found.');
    return NextResponse.json(task);
  } catch (err) {
    return handleRouteError(err);
  }
}
