import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError } from '@/lib/api/context';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireUser();

    const { data: repo } = await supabase.from('repositories').select('id').eq('id', id).maybeSingle();
    if (!repo) return jsonError(404, 'Repository not found in workspace.');

    const { data: files, error } = await supabase
      .from('repository_files')
      .select('file_path, content, language, file_size')
      .eq('repo_id', id)
      .order('file_path');

    if (error) return jsonError(500, error.message);

    return NextResponse.json(
      (files ?? []).map((f) => ({
        path: f.file_path,
        name: f.file_path.split('/').pop() ?? f.file_path,
        code: f.content,
        language: f.language ?? 'text',
        size: f.file_size,
      }))
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
