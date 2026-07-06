import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, rateLimit, writeAudit } from '@/lib/api/context';
import { indexRepository } from '@/features/repos/indexer';

const connectSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  language: z.string().optional(),
  branch: z.string().min(1).max(100).default('main'),
});

/** Shape a repository row + its latest index into the client contract. */
function toClientStatus(indexStatus: string | undefined): 'Indexing' | 'Indexed' | 'Failed' {
  if (indexStatus === 'completed') return 'Indexed';
  if (indexStatus === 'failed') return 'Failed';
  return 'Indexing';
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    // RLS scopes repositories to organizations the user belongs to.
    const { data: repos, error } = await supabase
      .from('repositories')
      .select('id, repo_name, repo_url, default_branch, created_at, repository_indexes ( status, error_message, created_at ), repository_files ( language )')
      .order('created_at', { ascending: false });

    if (error) return jsonError(500, error.message);
    void user;

    const shaped = (repos ?? []).map((repo) => {
      const indexes = [...(repo.repository_indexes ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const latest = indexes[0];
      const langCounts = new Map<string, number>();
      for (const f of repo.repository_files ?? []) {
        if (f.language) langCounts.set(f.language, (langCounts.get(f.language) ?? 0) + 1);
      }
      const dominant = [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        id: repo.id,
        repo_name: repo.repo_name,
        repo_url: repo.repo_url,
        language: dominant ?? '—',
        status: toClientStatus(latest?.status),
        error_message: latest?.error_message ?? null,
        created_at: repo.created_at,
      };
    });

    return NextResponse.json(shaped);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    rateLimit(`repos:create:${user.id}`, 15);

    const body = connectSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const { orgId, projectId } = await requireOrgContext(supabase, user.id);

    const { data: existing } = await supabase.from('repositories').select('id').eq('repo_url', body.data.url).maybeSingle();
    if (existing) return jsonError(400, 'Repository URL has already been connected in your workspace.');

    const { data: repo, error } = await supabase
      .from('repositories')
      .insert({
        project_id: projectId,
        repo_name: body.data.name,
        repo_url: body.data.url,
        default_branch: body.data.branch,
      })
      .select('id, repo_name, repo_url, default_branch, created_at')
      .single();

    if (error || !repo) return jsonError(500, error?.message ?? 'Failed to create repository');

    await writeAudit(supabase, { orgId, userId: user.id, action: 'repository_connected', entityType: 'repository', entityId: repo.id, metadata: { url: body.data.url } });

    // Real indexing runs after the response is sent; the UI polls job progress.
    after(() => indexRepository({ repoId: repo.id, repoUrl: repo.repo_url, branch: repo.default_branch, orgId }));

    return NextResponse.json(
      {
        id: repo.id,
        repo_name: repo.repo_name,
        repo_url: repo.repo_url,
        language: body.data.language ?? '—',
        status: 'Indexing',
        created_at: repo.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
