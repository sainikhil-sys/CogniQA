import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, rateLimit, writeAudit } from '@/lib/api/context';
import { isAIConfigured } from '@/lib/ai/openai';
import { runAgentTask } from '@/features/agent/engine';

const runSchema = z.object({
  repository_id: z.string().uuid(),
  prompt: z.string().min(4).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    rateLimit(`agent:run:${user.id}`, 10);

    if (!isAIConfigured()) {
      return jsonError(503, 'AI is not configured. Add OPENAI_API_KEY to your environment to run the engineering agent.');
    }

    const body = runSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const { data: repo } = await supabase.from('repositories').select('id').eq('id', body.data.repository_id).maybeSingle();
    if (!repo) return jsonError(404, 'Connected repository not found.');

    const { data: task, error } = await supabase
      .from('agent_tasks')
      .insert({ user_id: user.id, repo_id: repo.id, prompt: body.data.prompt, status: 'Ingestion', task_list: [] as never })
      .select('*')
      .single();
    if (error || !task) return jsonError(500, error?.message ?? 'Could not create agent task');

    const { orgId } = await requireOrgContext(supabase, user.id);
    await writeAudit(supabase, { orgId, userId: user.id, action: 'agent_task_started', entityType: 'agent_task', entityId: task.id, metadata: { prompt: body.data.prompt.slice(0, 120) } });

    after(() => runAgentTask({ taskId: task.id, repoId: repo.id, orgId, prompt: body.data.prompt }));

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
