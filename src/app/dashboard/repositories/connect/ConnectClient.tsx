'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  AlertCircle,
  Unplug,
  Loader2,
  ArrowLeft,
  Shield,
  GitBranch,
  Eye,
} from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}


export default function ConnectGitHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for error/success from callback
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Load org and connection status
  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        // Get user's first org
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          setError('No organization found. Please create one first.');
          setIsLoading(false);
          return;
        }

        const currentOrgId = memberships[0].organization_id;
        setOrgId(currentOrgId);

        // Check connection status
        const { data: connection } = await supabase
          .from('git_connections')
          .select('id')
          .eq('organization_id', currentOrgId)
          .maybeSingle();

        setIsConnected(!!connection);
      } catch {
        setError('Failed to load connection status.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [supabase, router]);

  const handleConnect = () => {
    if (!orgId) return;
    window.location.href = `/api/auth/github/connect?orgId=${orgId}`;
  };

  const handleDisconnect = async () => {
    if (!orgId) return;
    setIsDisconnecting(true);

    try {
      // Import dynamically to avoid pulling server code into client bundle
      const { disconnectGitHub } = await import(
        '@/features/repos/actions'
      );
      await disconnectGitHub({ organizationId: orgId });
      setIsConnected(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect.'
      );
    } finally {
      setIsDisconnecting(false);
    }
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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/repositories')}
            className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">GitHub Connection</h1>
            <p className="text-sm text-zinc-500">
              Connect your GitHub account to import and analyze repositories
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-400 hover:text-red-300 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-8 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              GitHub has been disconnected successfully.
            </p>
          </div>
        )}

        {/* Connection Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
              <GithubIcon className="h-7 w-7 text-zinc-100" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">GitHub</h2>
              <p className="text-sm text-zinc-500">
                {isConnected
                  ? 'Your GitHub account is connected'
                  : 'Connect to import repositories and access code'}
              </p>
            </div>
            <div className="ml-auto">
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-700/40 text-zinc-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Permissions Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <GitBranch className="h-5 w-5 text-cyan-400 mb-2" />
              <p className="text-sm font-medium text-zinc-300">
                Repository Access
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Read and write access to public and private repositories
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <Eye className="h-5 w-5 text-violet-400 mb-2" />
              <p className="text-sm font-medium text-zinc-300">
                Read User Profile
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Access to your GitHub profile and organization memberships
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <Shield className="h-5 w-5 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-zinc-300">
                Encrypted Storage
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Your token is encrypted at rest using AES-256-GCM
              </p>
            </div>
          </div>

          {/* Action Button */}
          {isConnected ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/repositories')}
                className="px-6 py-3 rounded-xl bg-cyan-500/15 text-cyan-400 font-medium hover:bg-cyan-500/25 transition-colors"
              >
                Browse Repositories
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-6 py-3 rounded-xl border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
                Disconnect GitHub
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-8 py-3.5 rounded-xl bg-zinc-100 text-zinc-900 font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-3 text-base"
            >
              <GithubIcon className="h-5 w-5" />
              Connect GitHub Account
            </button>
          )}
        </div>

        {/* Coming Soon: GitLab & Bitbucket */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="currentColor">
                  <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-300">GitLab</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              GitLab integration is planned for a future release.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 opacity-60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-400" fill="currentColor">
                  <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646L23.99 2.104a.768.768 0 0 0-.768-.891H.778zm14.52 15.065H8.986L7.19 8.334h10.07l-1.962 7.944z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-300">Bitbucket</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Bitbucket integration is planned for a future release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
