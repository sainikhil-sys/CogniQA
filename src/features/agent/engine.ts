import { createAdminClient } from '@/lib/supabase/admin';
import { chatComplete } from '@/lib/ai/openai';
import { logger } from '@/lib/logger';

/**
 * AI engineering agent pipeline.
 *
 * Every stage calls the real AI provider over the repository's real indexed
 * files. The pipeline stops at PendingApproval with an AI-generated diff.
 * Git push / PR creation / deployment are NOT implemented and are presented
 * as "Coming Soon" in the UI — never simulated.
 */

type Step = { name: string; status: 'pending' | 'running' | 'completed' | 'failed' };

const STEPS = ['Ingest Repository', 'Analyze Prompt & Identify Files', 'Generate Code Changes'] as const;

export async function runAgentTask(params: { taskId: string; repoId: string; orgId: string; prompt: string }): Promise<void> {
  const { taskId, repoId, orgId, prompt } = params;
  const admin = createAdminClient();
  const steps: Step[] = STEPS.map((name) => ({ name, status: 'pending' }));

  async function update(fields: Record<string, unknown>) {
    await admin.from('agent_tasks').update({ ...fields, task_list: steps as never } as never).eq('id', taskId);
  }

  async function fail(message: string) {
    const running = steps.find((s) => s.status === 'running');
    if (running) running.status = 'failed';
    await update({ status: 'Failed', error_message: message });
    logger.error({ taskId, message }, 'Agent task failed');
  }

  try {
    // 1. Ingest: load real indexed files
    steps[0].status = 'running';
    await update({ status: 'Ingestion' });

    const { data: files, error: filesError } = await admin
      .from('repository_files')
      .select('file_path, content, language')
      .eq('repo_id', repoId)
      .limit(300);

    if (filesError) return void (await fail(`Could not load repository files: ${filesError.message}`));
    if (!files || files.length === 0) {
      return void (await fail('Repository has no indexed files. Index the repository before running the agent.'));
    }
    steps[0].status = 'completed';

    // 2. Analyze prompt → identify affected files (real AI call)
    steps[1].status = 'running';
    await update({ status: 'PromptAnalysis' });

    const fileList = files.map((f) => f.file_path).join('\n');
    const analysis = await chatComplete(
      [
        {
          role: 'system',
          content:
            'You are a senior software engineer. Given a repository file list and a change request, respond with JSON: {"affected_files": string[], "plan": string}. Choose at most 4 files that exist in the list.',
        },
        { role: 'user', content: `Repository files:\n${fileList}\n\nChange request: ${prompt}` },
      ],
      { jsonMode: true, maxTokens: 800 }
    );

    let affectedFiles: string[] = [];
    let plan = '';
    try {
      const parsed = JSON.parse(analysis.content) as { affected_files?: string[]; plan?: string };
      affectedFiles = (parsed.affected_files ?? []).filter((p) => files.some((f) => f.file_path === p)).slice(0, 4);
      plan = parsed.plan ?? '';
    } catch {
      return void (await fail('AI analysis returned an unparseable plan. Retry the task.'));
    }
    if (affectedFiles.length === 0) {
      return void (await fail('The AI could not map the request to any existing repository files.'));
    }
    steps[1].status = 'completed';
    await update({ status: 'CodeIntelligence', affected_files: affectedFiles as never });

    // 3. Generate a real diff over the real file contents
    steps[2].status = 'running';
    await update({ status: 'CodeGeneration' });

    const context = affectedFiles
      .map((p) => {
        const f = files.find((x) => x.file_path === p)!;
        return `--- ${p} ---\n${f.content.slice(0, 8000)}`;
      })
      .join('\n\n');

    const generation = await chatComplete(
      [
        {
          role: 'system',
          content:
            'You are a senior software engineer. Produce a unified diff (git diff format) implementing the requested change against the provided files. Output ONLY the diff, no prose.',
        },
        { role: 'user', content: `Plan: ${plan}\n\nChange request: ${prompt}\n\nCurrent file contents:\n${context}` },
      ],
      { maxTokens: 3000 }
    );

    const diff = generation.content.replace(/^```(diff)?\n?|```$/g, '').trim();
    if (!diff.includes('---') && !diff.includes('+++')) {
      return void (await fail('AI did not produce a valid diff. Retry with a more specific prompt.'));
    }

    const totalTokens = analysis.tokensUsed + generation.tokensUsed;
    await admin.from('usage_records').insert({ organization_id: orgId, metric: 'tokens', quantity: totalTokens });

    steps[2].status = 'completed';
    await update({
      status: 'PendingApproval',
      code_diff: diff,
      branch_name: `feature/agent-${taskId.slice(0, 6)}`,
    });
    logger.info({ taskId, tokens: totalTokens }, 'Agent task ready for review');
  } catch (err) {
    await fail(err instanceof Error ? err.message : 'Agent pipeline failed unexpectedly');
  }
}
