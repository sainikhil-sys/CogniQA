import { gunzipSync } from 'zlib';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEmbeddings, isAIConfigured } from '@/lib/ai/openai';
import { logger } from '@/lib/logger';

/**
 * Repository indexing pipeline.
 *
 * Downloads the REAL repository archive from GitHub/GitLab, extracts source
 * files, runs static analysis (complexity, duplication, secret scanning,
 * circular imports), stores files, generates REAL OpenAI embeddings, and
 * writes security/tech-debt reports. Progress is persisted to analysis_jobs.
 *
 * There are no fallbacks to fabricated files or simulated vectors: when the
 * archive cannot be downloaded the index is marked failed with the real
 * error; when OpenAI is not configured the embedding step is explicitly
 * skipped and recorded as such.
 */

const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.prisma', '.java', '.cpp', '.cs', '.rb', '.rs', '.php'];
const MAX_FILES = 400;
const MAX_FILE_BYTES = 200_000;
const CHUNK_LINES = 35;
const MAX_CHUNKS = 1500;
const EMBED_BATCH = 64;

interface ExtractedFile {
  path: string;
  content: string;
}

interface FileMetrics {
  filename: string;
  totalLines: number;
  complexity: number;
  duplicationRate: number;
  imports: string[];
  securityFindings: { category: string; line: number; snippet: string; file: string }[];
}

// ---------------------------------------------------------------------------
// Archive download + minimal tar extraction (dependency-free)
// ---------------------------------------------------------------------------

function parseRepoUrl(repoUrl: string): { host: 'github' | 'gitlab'; path: string } {
  const url = new URL(repoUrl);
  const path = url.pathname.replace(/^\/+|\/+$|\.git$/g, '');
  if (url.hostname === 'github.com') return { host: 'github', path };
  if (url.hostname === 'gitlab.com') return { host: 'gitlab', path };
  throw new Error(`Unsupported repository host "${url.hostname}". GitHub and GitLab URLs are supported.`);
}

async function downloadArchive(repoUrl: string, preferredBranch: string): Promise<Buffer> {
  const { host, path } = parseRepoUrl(repoUrl);
  const branches = [...new Set([preferredBranch, 'main', 'master'])];
  let lastError = '';

  for (const branch of branches) {
    const archiveUrl =
      host === 'github'
        ? `https://codeload.github.com/${path}/tar.gz/refs/heads/${branch}`
        : `https://gitlab.com/${path}/-/archive/${branch}/archive.tar.gz`;
    const res = await fetch(archiveUrl, { redirect: 'follow' });
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
    lastError = `${archiveUrl} → HTTP ${res.status}`;
  }
  throw new Error(`Could not download repository archive. The repository must be public. Last attempt: ${lastError}`);
}

/** Minimal POSIX tar reader: iterates 512-byte headers and file payloads. */
function extractTar(tarball: Buffer): ExtractedFile[] {
  const data = gunzipSync(tarball);
  const files: ExtractedFile[] = [];
  let offset = 0;

  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    let name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    if (prefix) name = `${prefix}/${name}`;
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim() || '0', 8);
    const typeFlag = String.fromCharCode(header[156]);

    offset += 512;
    if ((typeFlag === '0' || typeFlag === '\0') && size > 0 && size <= MAX_FILE_BYTES) {
      // Strip the top-level "<repo>-<branch>/" directory
      const relPath = name.split('/').slice(1).join('/');
      const ext = relPath.slice(relPath.lastIndexOf('.'));
      const skip = relPath.includes('node_modules/') || relPath.includes('.git/') || relPath.includes('.next/');
      if (relPath && !skip && VALID_EXTENSIONS.includes(ext) && files.length < MAX_FILES) {
        files.push({ path: relPath, content: data.subarray(offset, offset + size).toString('utf8') });
      }
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

// ---------------------------------------------------------------------------
// Static analysis (real computation over real file contents)
// ---------------------------------------------------------------------------

const COMPLEXITY_KEYWORDS = ['if', 'for', 'while', 'catch', '&&', '\\|\\|', 'except', 'elif', 'case'];
const SECRET_PATTERNS: [RegExp, string][] = [
  [/(password|passwd|secret|private_key|token|auth_key)\s*=\s*['"][^'"]+['"]/i, 'Exposed Secret / Key'],
  [/sk-proj-[A-Za-z0-9\-_]{20,}/, 'Exposed OpenAI Token'],
  [/postgres:\/\/[^:]+:[^@]+@[^/]+\/[^\s'"]+/, 'Exposed Database URI'],
];

function analyzeFile(path: string, content: string): FileMetrics {
  const lines = content.split('\n');
  let complexity = 1;
  const seen = new Set<string>();
  let duplicates = 0;
  const findings: FileMetrics['securityFindings'] = [];
  const imports: string[] = [];

  lines.forEach((line, idx) => {
    const clean = line.replace(/(\/\/.*|#.*)/, '').trim();
    for (const kw of COMPLEXITY_KEYWORDS) {
      complexity += (clean.match(new RegExp(`\\b${kw}\\b`, 'g')) ?? []).length;
    }
    const trimmed = line.trim();
    if (trimmed.length > 15) {
      if (seen.has(trimmed)) duplicates += 1;
      seen.add(trimmed);
    }
    for (const [pattern, category] of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ category, line: idx + 1, snippet: trimmed.slice(0, 60), file: path });
      }
    }
  });

  for (const match of content.matchAll(/(?:import|from)\s+['"]?([\w@.\-/]+)['"]?/g)) {
    const dep = match[1];
    if (dep && !dep.startsWith('.') && !dep.startsWith('@/') && !imports.includes(dep)) imports.push(dep);
  }

  return {
    filename: path,
    totalLines: lines.length,
    complexity: Math.min(complexity, 100),
    duplicationRate: Math.round((duplicates / Math.max(lines.length, 1)) * 1000) / 10,
    imports,
    securityFindings: findings,
  };
}

function detectCircularDependencies(fileImports: Record<string, string[]>): string[][] {
  const visited: Record<string, boolean> = {};
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(node: string) {
    const inStack = stack.indexOf(node);
    if (inStack >= 0) {
      cycles.push([...stack.slice(inStack), node]);
      return;
    }
    if (visited[node]) return;
    visited[node] = true;
    stack.push(node);
    for (const neighbor of fileImports[node] ?? []) dfs(neighbor);
    stack.pop();
  }

  Object.keys(fileImports).forEach(dfs);
  return cycles;
}

function detectLanguage(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.rb')) return 'ruby';
  if (path.endsWith('.rs')) return 'rust';
  if (path.endsWith('.cs')) return 'csharp';
  if (path.endsWith('.cpp')) return 'cpp';
  if (path.endsWith('.php')) return 'php';
  if (path.endsWith('.prisma')) return 'prisma';
  return 'text';
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

type Step = { name: string; status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'; detail?: string };

export async function indexRepository(params: { repoId: string; repoUrl: string; branch: string; orgId: string }): Promise<void> {
  const { repoId, repoUrl, branch, orgId } = params;
  const admin = createAdminClient();

  const steps: Step[] = [
    { name: 'Download repository archive', status: 'pending' },
    { name: 'Extract & store source files', status: 'pending' },
    { name: 'Static analysis', status: 'pending' },
    { name: 'Generate embeddings', status: 'pending' },
  ];

  const { data: job } = await admin
    .from('analysis_jobs')
    .insert({ repo_id: repoId, job_type: 'repository_indexing', status: 'running', progress: 0, step_status: steps as never })
    .select('id')
    .single();

  const { data: indexRow } = await admin
    .from('repository_indexes')
    .insert({ repo_id: repoId, branch, commit_sha: 'HEAD', status: 'indexing' })
    .select('id')
    .single();

  async function updateJob(progress: number) {
    if (!job) return;
    await admin.from('analysis_jobs').update({ progress, step_status: steps as never }).eq('id', job.id);
  }

  async function fail(message: string) {
    logger.error({ repoId, message }, 'Repository indexing failed');
    if (job) await admin.from('analysis_jobs').update({ status: 'failed', error_message: message, step_status: steps as never }).eq('id', job.id);
    if (indexRow) await admin.from('repository_indexes').update({ status: 'failed', error_message: message }).eq('id', indexRow.id);
  }

  try {
    // 1. Download
    steps[0].status = 'running';
    await updateJob(5);
    let archive: Buffer;
    try {
      archive = await downloadArchive(repoUrl, branch);
    } catch (err) {
      steps[0].status = 'failed';
      await fail(err instanceof Error ? err.message : 'Archive download failed');
      return;
    }
    steps[0].status = 'completed';

    // 2. Extract + store files
    steps[1].status = 'running';
    await updateJob(25);
    const files = extractTar(archive);
    if (files.length === 0) {
      steps[1].status = 'failed';
      await fail('No supported source files found in the repository archive.');
      return;
    }

    await admin.from('repository_files').delete().eq('repo_id', repoId);
    await admin.from('embeddings').delete().eq('repo_id', repoId);

    for (let i = 0; i < files.length; i += 50) {
      const batch = files.slice(i, i + 50).map((f) => ({
        repo_id: repoId,
        file_path: f.path,
        file_size: Buffer.byteLength(f.content, 'utf8'),
        content: f.content,
        language: detectLanguage(f.path),
        hash: crypto.createHash('sha256').update(f.content).digest('hex'),
      }));
      const { error } = await admin.from('repository_files').insert(batch);
      if (error) throw new Error(`Failed to store files: ${error.message}`);
    }
    steps[1].status = 'completed';
    steps[1].detail = `${files.length} files stored`;

    // 3. Static analysis → security + tech debt reports
    steps[2].status = 'running';
    await updateJob(45);
    const fileImports: Record<string, string[]> = {};
    const metrics: FileMetrics[] = [];
    for (const f of files) {
      const m = analyzeFile(f.path, f.content);
      metrics.push(m);
      fileImports[f.path] = m.imports;
    }
    const cycles = detectCircularDependencies(fileImports);
    const allFindings = metrics.flatMap((m) => m.securityFindings);
    const avgComplexity = metrics.reduce((s, m) => s + m.complexity, 0) / metrics.length;
    const avgDuplication = metrics.reduce((s, m) => s + m.duplicationRate, 0) / metrics.length;

    const severityCounts = {
      high: allFindings.filter((f) => f.category !== 'Exposed Secret / Key').length,
      medium: allFindings.filter((f) => f.category === 'Exposed Secret / Key').length,
      low: 0,
    };

    await admin.from('security_reports').insert({
      repo_id: repoId,
      findings: allFindings as never,
      severity_counts: severityCounts as never,
    });

    const debtIssues = [
      ...cycles.map((c) => ({ type: 'circular_dependency', detail: c.join(' → ') })),
      ...metrics.filter((m) => m.complexity >= 50).map((m) => ({ type: 'high_complexity', detail: `${m.filename} (score ${m.complexity})` })),
      ...metrics.filter((m) => m.duplicationRate >= 10).map((m) => ({ type: 'duplication', detail: `${m.filename} (${m.duplicationRate}% duplicate lines)` })),
    ];
    await admin.from('tech_debt_reports').insert({
      repo_id: repoId,
      issues: {
        items: debtIssues,
        avg_complexity: Math.round(avgComplexity * 10) / 10,
        avg_duplication_percent: Math.round(avgDuplication * 10) / 10,
        circular_dependency_count: cycles.length,
        file_count: files.length,
      } as never,
      estimated_days: Math.round(debtIssues.length * 0.5 * 10) / 10,
    });
    steps[2].status = 'completed';

    // 4. Embeddings (real OpenAI — skipped explicitly when unconfigured)
    if (!isAIConfigured()) {
      steps[3].status = 'skipped';
      steps[3].detail = 'OPENAI_API_KEY not configured — repository chat unavailable until a key is added.';
      await updateJob(100);
      if (job) await admin.from('analysis_jobs').update({ status: 'completed', step_status: steps as never, progress: 100 }).eq('id', job.id);
      if (indexRow)
        await admin
          .from('repository_indexes')
          .update({ status: 'completed', error_message: 'Embeddings skipped: OPENAI_API_KEY not configured.' })
          .eq('id', indexRow.id);
      return;
    }

    steps[3].status = 'running';
    await updateJob(60);

    const chunks: { file_path: string; chunk_index: number; chunk_content: string }[] = [];
    outer: for (const f of files) {
      const lines = f.content.split('\n');
      for (let i = 0; i < lines.length; i += CHUNK_LINES) {
        if (chunks.length >= MAX_CHUNKS) break outer;
        const body = lines.slice(i, i + CHUNK_LINES).join('\n');
        chunks.push({
          file_path: f.path,
          chunk_index: Math.floor(i / CHUNK_LINES),
          chunk_content: `File: ${f.path} (lines ${i + 1}-${Math.min(i + CHUNK_LINES, lines.length)}):\n${body}`,
        });
      }
    }

    let totalTokens = 0;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const { vectors, tokensUsed } = await getEmbeddings(batch.map((c) => c.chunk_content));
      totalTokens += tokensUsed;
      const rows = batch.map((c, j) => ({
        repo_id: repoId,
        file_path: c.file_path,
        chunk_index: c.chunk_index,
        chunk_content: c.chunk_content,
        embedding: JSON.stringify(vectors[j]),
      }));
      const { error } = await admin.from('embeddings').insert(rows as never);
      if (error) throw new Error(`Failed to store embeddings: ${error.message}`);
      await updateJob(60 + Math.round((Math.min(i + EMBED_BATCH, chunks.length) / chunks.length) * 38));
    }

    if (totalTokens > 0) {
      await admin.from('usage_records').insert({ organization_id: orgId, metric: 'tokens', quantity: totalTokens });
    }

    steps[3].status = 'completed';
    steps[3].detail = `${chunks.length} chunks embedded (${totalTokens} tokens)`;
    if (job) await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, step_status: steps as never }).eq('id', job.id);
    if (indexRow) await admin.from('repository_indexes').update({ status: 'completed' }).eq('id', indexRow.id);
    logger.info({ repoId, files: files.length, chunks: chunks.length }, 'Repository indexed');
  } catch (err) {
    const current = steps.find((s) => s.status === 'running');
    if (current) current.status = 'failed';
    await fail(err instanceof Error ? err.message : 'Indexing failed unexpectedly');
  }
}
