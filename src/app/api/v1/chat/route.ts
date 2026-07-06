import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, requireOrgContext, handleRouteError, jsonError, rateLimit, recordTokenUsage } from '@/lib/api/context';
import { getEmbedding, chatComplete, isAIConfigured, AIConfigurationError } from '@/lib/ai/openai';

const chatSchema = z.object({
  repo_id: z.string().uuid(),
  question: z.string().min(1).max(4000),
});

/** Get or create the single conversation for this user + repository. */
async function getConversation(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  orgId: string,
  userId: string,
  repoId: string,
  repoName: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('repo_id', repoId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ organization_id: orgId, user_id: userId, repo_id: repoId, title: `Chat — ${repoName}` })
    .select('id')
    .single();
  if (error || !created) throw new Error(error?.message ?? 'Could not create conversation');
  return created.id;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    rateLimit(`chat:${user.id}`, 20);

    if (!isAIConfigured()) {
      return jsonError(503, 'AI is not configured. Add OPENAI_API_KEY to your environment to enable repository chat.');
    }

    const body = chatSchema.safeParse(await req.json());
    if (!body.success) return jsonError(400, body.error.issues.map((i) => i.message).join('; '));

    const { data: repo } = await supabase.from('repositories').select('id, repo_name').eq('id', body.data.repo_id).maybeSingle();
    if (!repo) return jsonError(404, 'Repository not found in workspace.');

    const { count: embeddingCount } = await supabase
      .from('embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('repo_id', repo.id);
    if (!embeddingCount) {
      return jsonError(409, 'This repository has no embeddings yet. Wait for indexing to finish (or re-index after configuring OPENAI_API_KEY).');
    }

    // 1. Real RAG: embed query → pgvector similarity search (RLS enforced)
    const { vector, tokensUsed: embedTokens } = await getEmbedding(body.data.question);
    const { data: matches, error: matchError } = await supabase.rpc('match_embeddings', {
      p_repo_id: repo.id,
      p_query_embedding: JSON.stringify(vector),
      p_match_count: 6,
    });
    if (matchError) return jsonError(500, `Vector search failed: ${matchError.message}`);

    const context = (matches ?? []).map((m) => m.chunk_content).join('\n\n---\n\n');

    // 2. Real AI completion grounded in the retrieved chunks
    const { content: answer, tokensUsed: chatTokens } = await chatComplete([
      {
        role: 'system',
        content:
          'You are CogniQA, an AI code intelligence engine. Answer the question using ONLY the repository context below. Cite file paths when referencing code. Use markdown code blocks with syntax highlighting. If the context does not contain the answer, say so plainly.\n\nRepository context:\n' +
          context,
      },
      { role: 'user', content: body.data.question },
    ]);

    // 3. Persist the exchange
    const { orgId } = await requireOrgContext(supabase, user.id);
    const conversationId = await getConversation(supabase, orgId, user.id, repo.id, repo.repo_name);
    const citations = (matches ?? []).map((m) => ({ file_path: m.file_path, similarity: m.similarity }));

    await supabase.from('messages').insert([
      { conversation_id: conversationId, sender_role: 'user', content: body.data.question },
      { conversation_id: conversationId, sender_role: 'assistant', content: answer, citations: citations as never },
    ]);

    await recordTokenUsage(supabase, orgId, embedTokens + chatTokens);

    return NextResponse.json({
      id: conversationId,
      question: body.data.question,
      response: answer,
      citations,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof AIConfigurationError) return jsonError(503, err.message);
    return handleRouteError(err);
  }
}
