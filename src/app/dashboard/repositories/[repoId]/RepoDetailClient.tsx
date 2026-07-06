'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitPullRequest,
  AlertCircle as IssueIcon,
  ExternalLink,
  Loader2,
  Star,
  GitFork,
  Lock,
  Globe,
  Clock,
  User,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

type TabType = 'overview' | 'branches' | 'commits' | 'prs' | 'issues';

interface RepoData {
  id: string;
  repo_name: string;
  repo_url: string;
  default_branch: string;
  projectId: string;
  projectName: string;
}

interface GitHubRepoInfo {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
}

interface BranchData {
  name: string;
  sha: string;
  isProtected: boolean;
}

interface CommitData {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string; avatarUrl?: string };
  url: string;
}

interface PRData {
  number: number;
  title: string;
  state: string;
  author: { login: string; avatarUrl: string };
  createdAt: string;
  headBranch: string;
  baseBranch: string;
  url: string;
}

interface IssueData {
  number: number;
  title: string;
  state: string;
  author: { login: string; avatarUrl: string };
  labels: Array<{ name: string; color: string }>;
  createdAt: string;
  url: string;
}

export default function RepoDetailClient() {
  const router = useRouter();
  const params = useParams();
  const repoId = params.repoId as string;
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab data
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [prs, setPRs] = useState<PRData[]>([]);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabPages, setTabPages] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});

  // Load repo from DB
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/login'); return; }

        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);

        if (!memberships?.length) { setError('No organization found.'); return; }
        const currentOrgId = memberships[0].organization_id;
        setOrgId(currentOrgId);

        // Get repo with project info
        const { data: repoData } = await supabase
          .from('repositories')
          .select(`
            id,
            repo_name,
            repo_url,
            default_branch,
            project:projects!inner (
              id,
              name,
              organization_id
            )
          `)
          .eq('id', repoId)
          .single();

        if (!repoData) {
          setError('Repository not found.');
          setIsLoading(false);
          return;
        }

        const project = repoData.project as unknown as {
          id: string;
          name: string;
          organization_id: string;
        };

        if (project.organization_id !== currentOrgId) {
          setError('Access denied.');
          setIsLoading(false);
          return;
        }

        setRepo({
          id: repoData.id,
          repo_name: repoData.repo_name,
          repo_url: repoData.repo_url,
          default_branch: repoData.default_branch,
          projectId: project.id,
          projectName: project.name,
        });
      } catch {
        setError('Failed to load repository.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [supabase, router, repoId]);

  // Load GitHub info for overview
  const loadRepoInfo = useCallback(async () => {
    if (!repo || !orgId) return;
    const parts = repo.repo_url.replace('https://github.com/', '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return;

    try {
      const { getRepoInfo } = await import('@/features/repos/actions');
      const info = await getRepoInfo(orgId, parts[0], parts[1]);
      setRepoInfo(info as unknown as GitHubRepoInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repo info from GitHub.');
    }
  }, [repo, orgId]);

  useEffect(() => {
    if (repo && orgId) loadRepoInfo();
  }, [repo, orgId, loadRepoInfo]);

  // Load tab data
  const loadTabData = useCallback(async (tab: TabType, page = 1) => {
    if (!repo || !orgId) return;
    const parts = repo.repo_url.replace('https://github.com/', '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return;

    if (tab === 'overview') return;

    setTabLoading(true);
    try {
      const { getRepoGitHubData } = await import('@/features/repos/actions');
      const dataType = tab === 'prs' ? 'prs' : tab;
      const result = await getRepoGitHubData(
        { owner: parts[0], repo: parts[1], organizationId: orgId, page, perPage: 20 },
        dataType as 'branches' | 'commits' | 'prs' | 'issues'
      );

      const newData = result.data;
      if (page === 1) {
        if (tab === 'branches') setBranches(newData as unknown as BranchData[]);
        else if (tab === 'commits') setCommits(newData as unknown as CommitData[]);
        else if (tab === 'prs') setPRs(newData as unknown as PRData[]);
        else if (tab === 'issues') setIssues(newData as unknown as IssueData[]);
      } else {
        if (tab === 'branches') setBranches(prev => [...prev, ...(newData as unknown as BranchData[])]);
        else if (tab === 'commits') setCommits(prev => [...prev, ...(newData as unknown as CommitData[])]);
        else if (tab === 'prs') setPRs(prev => [...prev, ...(newData as unknown as PRData[])]);
        else if (tab === 'issues') setIssues(prev => [...prev, ...(newData as unknown as IssueData[])]);
      }

      setTabPages(prev => ({ ...prev, [tab]: page }));
      setHasMore(prev => ({ ...prev, [tab]: result.hasNextPage }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${tab}.`);
    } finally {
      setTabLoading(false);
    }
  }, [repo, orgId]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab, 1);
    }
  }, [activeTab, loadTabData]);

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: <GitBranch className="h-4 w-4" /> },
    { id: 'branches', label: 'Branches', icon: <GitBranch className="h-4 w-4" />, count: branches.length || undefined },
    { id: 'commits', label: 'Commits', icon: <GitCommit className="h-4 w-4" />, count: commits.length || undefined },
    { id: 'prs', label: 'Pull Requests', icon: <GitPullRequest className="h-4 w-4" />, count: prs.length || undefined },
    { id: 'issues', label: 'Issues', icon: <IssueIcon className="h-4 w-4" />, count: issues.length || undefined },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error && !repo) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/dashboard/repositories')} className="text-cyan-400 hover:underline">
            Back to Repositories
          </button>
        </div>
      </div>
    );
  }

  if (!repo) return null;

  const ownerRepo = repo.repo_url.replace('https://github.com/', '').replace(/\/$/, '');

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/repositories')}
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {repoInfo?.isPrivate ? (
                  <Lock className="h-4 w-4 text-amber-400" />
                ) : (
                  <Globe className="h-4 w-4 text-emerald-400" />
                )}
                <h1 className="text-xl font-semibold truncate">{ownerRepo}</h1>
                <a
                  href={repo.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {repoInfo?.description && (
                <p className="text-sm text-zinc-500 truncate">
                  {repoInfo.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-500 shrink-0">
              {repoInfo && (
                <>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {repoInfo.starCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-4 w-4" />
                    {repoInfo.forkCount.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && repo && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <IssueIcon className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info Card */}
            <div className="lg:col-span-2 glass-panel rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4">Repository Info</h3>
              {repoInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-zinc-500">Language</span>
                      <p className="text-sm font-medium">{repoInfo.language ?? 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Default Branch</span>
                      <p className="text-sm font-medium">{repoInfo.defaultBranch}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Visibility</span>
                      <p className="text-sm font-medium">{repoInfo.isPrivate ? 'Private' : 'Public'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Last Updated</span>
                      <p className="text-sm font-medium">{formatDate(repoInfo.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {(['branches', 'commits', 'prs', 'issues'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="w-full p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-cyan-500/20 transition-colors flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{tab === 'prs' ? 'Pull Requests' : tab}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Branches Tab */}
        {activeTab === 'branches' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Branches</h3>
              <button onClick={() => loadTabData('branches', 1)} className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {tabLoading && branches.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
            ) : branches.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center"><p className="text-zinc-500">No branches found.</p></div>
            ) : (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div key={branch.name} className="glass-panel rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-medium">{branch.name}</span>
                      {branch.name === repo?.default_branch && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">default</span>
                      )}
                      {branch.isProtected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">protected</span>
                      )}
                    </div>
                    <code className="text-xs text-zinc-600 font-mono">{branch.sha.slice(0, 7)}</code>
                  </div>
                ))}
                {hasMore['branches'] && (
                  <div className="text-center pt-4">
                    <button onClick={() => loadTabData('branches', (tabPages['branches'] ?? 1) + 1)} disabled={tabLoading}
                      className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800/50 disabled:opacity-50">
                      {tabLoading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Commits Tab */}
        {activeTab === 'commits' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Recent Commits</h3>
              <button onClick={() => loadTabData('commits', 1)} className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {tabLoading && commits.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
            ) : commits.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center"><p className="text-zinc-500">No commits found.</p></div>
            ) : (
              <div className="space-y-2">
                {commits.map((commit) => (
                  <a key={commit.sha} href={commit.url} target="_blank" rel="noopener noreferrer"
                    className="glass-panel rounded-xl p-4 flex items-start gap-4 hover:border-cyan-500/20 transition-colors block">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      {commit.author.avatarUrl ? (
                        <img src={commit.author.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 line-clamp-1">{commit.message.split('\n')[0]}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{commit.author.name}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(commit.author.date)}</span>
                      </div>
                    </div>
                    <code className="text-xs text-zinc-600 font-mono shrink-0">{commit.sha.slice(0, 7)}</code>
                  </a>
                ))}
                {hasMore['commits'] && (
                  <div className="text-center pt-4">
                    <button onClick={() => loadTabData('commits', (tabPages['commits'] ?? 1) + 1)} disabled={tabLoading}
                      className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800/50 disabled:opacity-50">
                      {tabLoading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PRs Tab */}
        {activeTab === 'prs' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Pull Requests</h3>
              <button onClick={() => loadTabData('prs', 1)} className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {tabLoading && prs.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
            ) : prs.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center"><p className="text-zinc-500">No pull requests found.</p></div>
            ) : (
              <div className="space-y-2">
                {prs.map((pr) => (
                  <a key={pr.number} href={pr.url} target="_blank" rel="noopener noreferrer"
                    className="glass-panel rounded-xl p-4 flex items-start gap-4 hover:border-cyan-500/20 transition-colors block">
                    <div className="mt-1">
                      <GitPullRequest className={`h-5 w-5 ${
                        pr.state === 'open' ? 'text-emerald-400' : pr.state === 'merged' ? 'text-violet-400' : 'text-red-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{pr.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>#{pr.number}</span>
                        <span>{pr.author.login}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          pr.state === 'open' ? 'bg-emerald-500/15 text-emerald-400' : pr.state === 'merged' ? 'bg-violet-500/15 text-violet-400' : 'bg-red-500/15 text-red-400'
                        }`}>{pr.state}</span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />{pr.headBranch} → {pr.baseBranch}
                        </span>
                        <span>{formatDate(pr.createdAt)}</span>
                      </div>
                    </div>
                  </a>
                ))}
                {hasMore['prs'] && (
                  <div className="text-center pt-4">
                    <button onClick={() => loadTabData('prs', (tabPages['prs'] ?? 1) + 1)} disabled={tabLoading}
                      className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800/50 disabled:opacity-50">
                      {tabLoading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Issues</h3>
              <button onClick={() => loadTabData('issues', 1)} className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {tabLoading && issues.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
            ) : issues.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center"><p className="text-zinc-500">No issues found.</p></div>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <a key={issue.number} href={issue.url} target="_blank" rel="noopener noreferrer"
                    className="glass-panel rounded-xl p-4 flex items-start gap-4 hover:border-cyan-500/20 transition-colors block">
                    <div className="mt-1">
                      <IssueIcon className={`h-5 w-5 ${
                        issue.state === 'open' ? 'text-emerald-400' : 'text-zinc-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{issue.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                        <span>#{issue.number}</span>
                        <span>{issue.author.login}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          issue.state === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/40 text-zinc-400'
                        }`}>{issue.state}</span>
                        {issue.labels.map((label) => (
                          <span key={label.name} className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}>
                            {label.name}
                          </span>
                        ))}
                        <span>{formatDate(issue.createdAt)}</span>
                      </div>
                    </div>
                  </a>
                ))}
                {hasMore['issues'] && (
                  <div className="text-center pt-4">
                    <button onClick={() => loadTabData('issues', (tabPages['issues'] ?? 1) + 1)} disabled={tabLoading}
                      className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800/50 disabled:opacity-50">
                      {tabLoading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
