'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Search,
  ExternalLink,
  GitBranch,
  Star,
  Lock,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Settings,
  Trash2,
  Import,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

interface ImportedRepo {
  id: string;
  repo_name: string;
  repo_url: string;
  default_branch: string;
  created_at: string;
  projectId: string;
  projectName: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string | null;
  starCount: number;
  forkCount: number;
  isPrivate: boolean;
  updatedAt: string;
}

export default function RepositoriesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [importedRepos, setImportedRepos] = useState<ImportedRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingGitHub, setLoadingGitHub] = useState(false);
  const [githubPage, setGithubPage] = useState(1);
  const [hasMoreGithub, setHasMoreGithub] = useState(false);
  const [importingRepo, setImportingRepo] = useState<string | null>(null);
  const [removingRepo, setRemovingRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setJustConnected(true);
      setTimeout(() => setJustConnected(false), 5000);
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!memberships?.length) {
        setError('No organization found.');
        setIsLoading(false);
        return;
      }

      const currentOrgId = memberships[0].organization_id;
      setOrgId(currentOrgId);

      // Check GitHub connection
      const { data: connection } = await supabase
        .from('git_connections')
        .select('id')
        .eq('organization_id', currentOrgId)
        .maybeSingle();

      setIsConnected(!!connection);

      // Load imported repos
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          repositories (
            id,
            repo_name,
            repo_url,
            default_branch,
            created_at
          )
        `)
        .eq('organization_id', currentOrgId);

      if (projects) {
        const repos = projects.flatMap((p) =>
          ((p.repositories as unknown as ImportedRepo[]) ?? []).map((r) => ({
            ...r,
            projectId: p.id,
            projectName: p.name,
          }))
        );
        setImportedRepos(repos);
      }
    } catch {
      setError('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadGitHubRepos = async (page = 1) => {
    if (!orgId) return;
    setLoadingGitHub(true);
    try {
      const { listGitHubRepos } = await import('@/features/repos/actions');
      const result = await listGitHubRepos({
        organizationId: orgId,
        page,
        perPage: 30,
      });
      if (page === 1) {
        setGithubRepos(result.data as unknown as GitHubRepo[]);
      } else {
        setGithubRepos((prev) => [...prev, ...(result.data as unknown as GitHubRepo[])]);
      }
      setHasMoreGithub(result.hasNextPage);
      setGithubPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub repos.');
    } finally {
      setLoadingGitHub(false);
    }
  };

  const handleOpenImport = () => {
    setShowImportModal(true);
    loadGitHubRepos(1);
  };

  const handleImport = async (repo: GitHubRepo) => {
    if (!orgId) return;
    setImportingRepo(repo.fullName);
    try {
      const { importRepository } = await import('@/features/repos/actions');
      await importRepository({
        organizationId: orgId,
        repoFullName: repo.fullName,
        repoName: repo.name,
        repoUrl: repo.url,
        defaultBranch: repo.defaultBranch,
      });
      setShowImportModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import repository.');
    } finally {
      setImportingRepo(null);
    }
  };

  const handleRemove = async (repoId: string) => {
    if (!orgId) return;
    setRemovingRepo(repoId);
    try {
      const { removeRepository } = await import('@/features/repos/actions');
      await removeRepository(repoId, orgId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove repository.');
    } finally {
      setRemovingRepo(null);
    }
  };

  const filteredRepos = importedRepos.filter(
    (r) =>
      r.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const importedUrls = new Set(importedRepos.map((r) => r.repo_url));

  const languageColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    Ruby: '#701516',
    'C++': '#f34b7d',
    C: '#555555',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    PHP: '#4F5D95',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Repositories</h1>
              <p className="text-sm text-zinc-500">
                {importedRepos.length} repositor{importedRepos.length === 1 ? 'y' : 'ies'} imported
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/repositories/connect')}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800/50 transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Connection
            </button>
            {isConnected && (
              <button
                onClick={handleOpenImport}
                className="px-4 py-2.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-sm font-medium hover:bg-cyan-500/25 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Import Repository
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Banner */}
        {justConnected && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              GitHub connected successfully! You can now import repositories.
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Dismiss</button>
            </div>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-6">
              <GithubIcon className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Connect your GitHub account
            </h2>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
              Link your GitHub account to import repositories, browse code, and
              run AI-powered analysis on your codebase.
            </p>
            <button
              onClick={() => router.push('/dashboard/repositories/connect')}
              className="px-8 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-200 transition-colors inline-flex items-center gap-3"
            >
              <GithubIcon className="h-5 w-5" />
              Connect GitHub
            </button>
          </div>
        )}

        {/* Connected — Repository List */}
        {isConnected && (
          <>
            {/* Search */}
            {importedRepos.length > 0 && (
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 text-sm"
                />
              </div>
            )}

            {/* Empty Imported State */}
            {importedRepos.length === 0 && (
              <div className="glass-panel rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                  <Import className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  No repositories imported yet
                </h2>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                  Import a repository from your GitHub account to start
                  analyzing code, chatting with your codebase, and running
                  security scans.
                </p>
                <button
                  onClick={handleOpenImport}
                  className="px-6 py-3 rounded-xl bg-cyan-500/15 text-cyan-400 font-medium hover:bg-cyan-500/25 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Import Your First Repository
                </button>
              </div>
            )}

            {/* Repository Grid */}
            {filteredRepos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRepos.map((repo) => {
                  const ownerRepo = repo.repo_url
                    .replace('https://github.com/', '')
                    .replace(/\/$/, '');

                  return (
                    <div
                      key={repo.id}
                      className="glass-panel rounded-xl p-5 hover:border-cyan-500/20 transition-all group cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/repositories/${repo.id}`)
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <GithubIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {ownerRepo}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={repo.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(repo.id);
                            }}
                            disabled={removingRepo === repo.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 disabled:opacity-50"
                          >
                            {removingRepo === repo.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-500 mb-3">
                        Project: {repo.projectName}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {repo.default_branch}
                        </span>
                        <span>
                          Imported{' '}
                          {new Date(repo.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Import Repository</h3>
                <p className="text-sm text-zinc-500">
                  Select a repository from your GitHub account
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {loadingGitHub && githubRepos.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span className="ml-3 text-sm text-zinc-400">
                    Loading repositories from GitHub...
                  </span>
                </div>
              ) : githubRepos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500">No repositories found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {githubRepos.map((repo) => {
                    const alreadyImported = importedUrls.has(repo.url);
                    return (
                      <div
                        key={repo.id}
                        className={`p-4 rounded-xl border transition-colors ${
                          alreadyImported
                            ? 'border-zinc-800/30 bg-zinc-900/30 opacity-60'
                            : 'border-zinc-800/50 hover:border-cyan-500/20 bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {repo.isPrivate ? (
                                <Lock className="h-3.5 w-3.5 text-amber-400" />
                              ) : (
                                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                              )}
                              <span className="text-sm font-medium text-zinc-200 truncate">
                                {repo.fullName}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-xs text-zinc-500 line-clamp-1 mb-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-zinc-600">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        languageColors[repo.language] ?? '#888',
                                    }}
                                  />
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {repo.starCount}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 shrink-0">
                            {alreadyImported ? (
                              <span className="text-xs text-zinc-500 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                Imported
                              </span>
                            ) : (
                              <button
                                onClick={() => handleImport(repo)}
                                disabled={importingRepo === repo.fullName}
                                className="px-4 py-2 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-medium hover:bg-cyan-500/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {importingRepo === repo.fullName ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                                Import
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load More */}
                  {hasMoreGithub && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => loadGitHubRepos(githubPage + 1)}
                        disabled={loadingGitHub}
                        className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
                      >
                        {loadingGitHub ? (
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        ) : null}
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
