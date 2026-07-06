import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';

export async function GET(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  try {
    const { repoId } = await params;
    const { supabase, user } = await requireUser();

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('repo_id', repoId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!conversation) return NextResponse.json([]);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, sender_role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) return jsonError(500, error.message);

    // Pair user/assistant messages into the {question, response} shape the client renders.
    const history: { id: string; question: string; response: string; created_at: string }[] = [];
    let pendingQuestion: { id: string; content: string; created_at: string } | null = null;
    for (const msg of messages ?? []) {
      if (msg.sender_role === 'user') {
        pendingQuestion = { id: msg.id, content: msg.content, created_at: msg.created_at };
      } else if (msg.sender_role === 'assistant' && pendingQuestion) {
        history.push({ id: msg.id, question: pendingQuestion.content, response: msg.content, created_at: msg.created_at });
        pendingQuestion = null;
      }
    }

    return NextResponse.json(history);
  } catch (err) {
    return handleRouteError(err);
  }
}
