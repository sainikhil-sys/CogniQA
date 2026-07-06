import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';

export async function GET(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  try {
    const { repoId } = await params;
    const { supabase, user } = await requireUser();

    const { data: tasks, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('repo_id', repoId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return jsonError(500, error.message);
    return NextResponse.json(tasks ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}
