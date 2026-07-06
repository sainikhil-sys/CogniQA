"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "password" | "magic-link" | "forgot-password";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted) return;
    
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during credentials login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted) return;

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("A secure magic sign-in link has been sent to your email.");
      setEmail("");
    } catch (err: any) {
      setErrorMessage(err.message || "Could not issue magic link email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted) return;

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Password reset instructions have been sent to your email.");
      setEmail("");
    } catch (err: any) {
      setErrorMessage(err.message || "Could not process password recovery request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    if (!isMounted) return;
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "OAuth authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center p-6">
      
      {/* Background cyber grid */}
      <div className="absolute inset-0 cyber-grid opacity-30 -z-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -z-10 animate-pulse-glow" />

      {/* Auth Card */}
      <div className="w-full max-w-md bg-zinc-950/70 border border-zinc-900 rounded-xl p-8 glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="flex items-center gap-2 group mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              C
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              Cogni<span className="text-cyan-400">QA</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white">Welcome to CogniQA</h2>
          <p className="text-zinc-500 text-xs mt-1">Authenticate to access codebase intelligence</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-xs text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Tab Selection */}
        {mode !== "forgot-password" && (
          <div className="grid grid-cols-2 gap-1 bg-zinc-900/60 p-1 rounded-lg mb-6 border border-zinc-900 text-xs font-semibold">
            <button
              onClick={() => { setMode("password"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`py-1.5 rounded-md cursor-pointer transition-colors ${mode === "password" ? "bg-zinc-800 text-cyan-400" : "text-zinc-400 hover:text-white"}`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode("magic-link"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`py-1.5 rounded-md cursor-pointer transition-colors ${mode === "magic-link" ? "bg-zinc-800 text-cyan-400" : "text-zinc-400 hover:text-white"}`}
            >
              Magic Link
            </button>
          </div>
        )}

        {/* Password Reset Title */}
        {mode === "forgot-password" && (
          <div className="bg-zinc-900/60 p-3 rounded-lg mb-6 border border-zinc-800 text-center text-xs">
            <span className="font-semibold text-zinc-300">Password Recovery Mode</span>
          </div>
        )}

        {/* GitHub OAuth Button */}
        {mode !== "forgot-password" && (
          <>
            <button
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-sm font-semibold transition-all mb-5 hover:border-cyan-500/30 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              Continue with GitHub
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-900"></div>
              </div>
              <span className="relative px-3 bg-[#0a0a0d] text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Or use email
              </span>
            </div>
          </>
        )}

        {/* Dynamic Auth Forms */}
        {mode === "password" && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-zinc-400 font-semibold block">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode("forgot-password"); setErrorMessage(""); setSuccessMessage(""); }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 text-black text-sm font-bold hover:bg-cyan-300 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50 mt-6 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === "magic-link" && (
          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 text-black text-sm font-bold hover:bg-cyan-300 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50 mt-6 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                <>
                  Send Magic Link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === "forgot-password" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Account Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400 text-black text-sm font-bold hover:bg-cyan-300 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,210,255,0.2)] disabled:opacity-50 mt-6 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Recovery Email...
                </>
              ) : (
                <>
                  Send Recovery Link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode("password"); setErrorMessage(""); setSuccessMessage(""); }}
              className="w-full text-center text-xs text-zinc-500 hover:text-white mt-4 font-semibold cursor-pointer block"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* Register redirection */}
        {mode !== "forgot-password" && (
          <p className="text-center text-xs text-zinc-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Create Account
            </Link>
          </p>
        )}

      </div>
    </div>
  );
}
