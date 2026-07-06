import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';

export async function GET(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  try {
    const { repoId } = await params;
    const { supabase } = await requireUser();

    const { data: repo } = await supabase.from('repositories').select('id').eq('id', repoId).maybeSingle();
    if (!repo) return jsonError(404, 'Repository not found in workspace.');

    const { data: jobs, error } = await supabase
      .from('analysis_jobs')
      .select('id, job_type, status, progress, error_message, step_status, created_at, updated_at')
      .eq('repo_id', repoId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return jsonError(500, error.message);
    return NextResponse.json(jobs ?? []);
  } catch (err) {
    return handleRouteError(err);
  }
}
