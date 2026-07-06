import { NextResponse } from 'next/server';
import { requireUser, handleRouteError, jsonError, rateLimit } from '@/lib/api/context';

interface DebtIssues {
  items?: { type: string; detail: string }[];
  avg_complexity?: number;
  avg_duplication_percent?: number;
  circular_dependency_count?: number;
  file_count?: number;
}

/**
 * Repository quality report — every number is derived from the stored
 * static-analysis results of the latest indexing run. When no analysis has
 * completed yet this returns 404 and the client renders an empty state
 * (never baseline placeholder scores).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ repoId: string }> }) {
  try {
    const { repoId } = await params;
    const { supabase, user } = await requireUser();
    rateLimit(`reports:${user.id}`, 30);

    const { data: repo } = await supabase.from('repositories').select('id').eq('id', repoId).maybeSingle();
    if (!repo) return jsonError(404, 'Repository not found in workspace.');

    const [{ data: security }, { data: debt }] = await Promise.all([
      supabase.from('security_reports').select('findings, severity_counts, created_at').eq('repo_id', repoId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('tech_debt_reports').select('issues, estimated_days, created_at').eq('repo_id', repoId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!security && !debt) {
      return jsonError(404, 'No analysis report exists for this repository yet. Reports are generated when indexing completes.');
    }

    const severity = (security?.severity_counts ?? { high: 0, medium: 0, low: 0 }) as { high: number; medium: number; low: number };
    const findings = (security?.findings ?? []) as { category: string; line: number; snippet: string; file: string }[];
    const issues = (debt?.issues ?? {}) as DebtIssues;

    // Documented scoring formulas over real analysis output:
    const securityScore = Math.max(100 - severity.high * 15 - severity.medium * 10 - severity.low * 5, 0);
    const complexityScore = Math.min(Math.round((issues.avg_complexity ?? 0) * 2), 100);
    const debtItems = issues.items ?? [];
    const techDebtScore = Math.min(Math.round((issues.avg_duplication_percent ?? 0) * 1.5 + (issues.circular_dependency_count ?? 0) * 5), 100);
    const healthScore = Math.max(Math.round(securityScore * 0.6 + (100 - techDebtScore) * 0.4), 0);

    return NextResponse.json({
      repo_id: repoId,
      health_score: healthScore,
      complexity_score: complexityScore,
      security_score: securityScore,
      tech_debt_score: techDebtScore,
      duplicate_code_percent: issues.avg_duplication_percent ?? 0,
      circular_dependency_count: issues.circular_dependency_count ?? 0,
      analyzed_file_count: issues.file_count ?? 0,
      estimated_remediation_days: debt?.estimated_days ?? 0,
      tech_debt_issues: debtItems,
      vulnerabilities: findings,
      generated_at: security?.created_at ?? debt?.created_at,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
