"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvitation } from "@/features/orgs/actions";
import { UserPlus, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const token = searchParams.get("token");

  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setIsMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleAccept = async () => {
    if (!token) {
      setErrorMsg("Invitation token is missing.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await acceptInvitation(token);
      setSuccessMsg("You have successfully joined the organization workspace!");
      
      // Save joined organization context and redirect
      setTimeout(() => {
        router.replace("/dashboard");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept the invitation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center p-6">
      
      {/* Cyber grid back */}
      <div className="absolute inset-0 cyber-grid opacity-30 -z-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -z-10 animate-pulse-glow" />

      {/* Invitation Card */}
      <div className="w-full max-w-md bg-zinc-950/70 border border-zinc-900 rounded-xl p-8 glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Organization Invitation</h2>
          <p className="text-zinc-500 text-xs mt-1">You have been invited to join a collaborative workspace</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-start gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-900/50 rounded-lg text-xs text-emerald-400 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold">{successMsg}</p>
              <p className="text-[10px] text-emerald-500/80 mt-1">Redirecting to console dashboard...</p>
            </div>
          </div>
        )}

        {!token ? (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-500 leading-normal">
              This invitation link is invalid or incomplete. Please verify the URL provided in your email invite.
            </p>
            <Link 
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Go to Login <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-5 text-center">
            <p className="text-xs text-zinc-400 leading-normal">
              You must have an authenticated CogniQA account to accept invitations. Please sign up or log in first.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href={`/signup?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                className="px-4 py-2 bg-cyan-400 text-black text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
              >
                Register
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          !successMsg && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-400 text-center leading-normal">
                You are currently signed in. Click the button below to join the workspace and collaborate on codebases.
              </p>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 text-black text-sm font-bold hover:bg-cyan-300 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining Workspace...
                  </>
                ) : (
                  <>
                    Accept & Join Workspace
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )
        )}

      </div>
    </div>
  );
}
