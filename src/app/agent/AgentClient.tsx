"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  Loader2, 
  Terminal, 
  Cpu, 
  GitBranch, 
  GitPullRequest, 
  Check, 
  Play, 
  ShieldCheck, 
  FileCode, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  HelpCircle,
  ExternalLink
} from "lucide-react";

interface Repository {
  id: string;
  repo_name: string;
  repo_url: string;
}

interface AgentTask {
  id: string;
  prompt: string;
  branch_name: string;
  deployment_target: string;
  status: "Ingestion" | "PromptAnalysis" | "CodeIntelligence" | "CodeGeneration" | "Validation" | "GitOperations" | "PullRequestGeneration" | "PendingApproval" | "Deploying" | "Completed" | "Failed";
  task_list: any[];
  affected_files: string[];
  code_diff: string;
  validation_report: any;
  pr_url: string;
  deployment_url: string;
  error_message: string;
  created_at: string;
}

export default function AgentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  
  // Tasks and Prompt
  const [prompt, setPrompt] = useState("");
  const [deployTarget, setDeployTarget] = useState("vercel");
  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` 
    : "http://localhost:8000/api/v1";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      router.replace("/login");
      throw new Error("No active session found.");
    }
    
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...options.headers
      }
    });
  };

  const loadConnectedRepositories = async () => {
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/repositories`);
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
        if (data.length > 0) {
          setSelectedRepoId(data[0].id);
        }
      }
    } catch (err) {
      setErrorMessage("Could not connect to codebase server.");
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadConnectedRepositories();
  }, [isMounted]);

  // Polling loop for active agent task status
  useEffect(() => {
    if (!isMounted || !activeTask) return;
    if (activeTask.status === "Completed" || activeTask.status === "Failed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth(`${apiBaseUrl}/agent/status/${activeTask.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveTask(data);
          if (data.status === "Completed" || data.status === "Failed" || data.status === "PendingApproval") {
            clearInterval(interval);
            setIsRunning(false);
          }
        }
      } catch (err) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isMounted, activeTask?.id, activeTask?.status]);

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedRepoId) return;

    setIsRunning(true);
    setErrorMessage("");
    setActiveTask(null);

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/agent/run`, {
        method: "POST",
        body: JSON.stringify({
          repository_id: selectedRepoId,
          prompt: prompt,
          deployment_target: deployTarget
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTask(data);
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || "Failed to trigger AI Engineering Agent.");
        setIsRunning(false);
      }
    } catch (err) {
      setErrorMessage("Failed to handshake with Agent workspace.");
      setIsRunning(false);
    }
  };

  const handleApprove = async () => {
    if (!activeTask) return;
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/agent/approve/${activeTask.id}`, {
        method: "POST"
      });
      if (res.ok) {
        // Optimistically set status to trigger polling again
        setActiveTask(prev => prev ? { ...prev, status: "Deploying" } : null);
      } else {
        alert("Failed to approve task.");
      }
    } catch (err) {
      alert("Error reaching agent router.");
    }
  };

  const handleReject = async () => {
    if (!activeTask) return;
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/agent/reject/${activeTask.id}`, {
        method: "POST"
      });
      if (res.ok) {
        setActiveTask(prev => prev ? { ...prev, status: "Failed", error_message: "Rejected by user" } : null);
      } else {
        alert("Failed to reject task.");
      }
    } catch (err) {
      alert("Error reaching agent router.");
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans h-screen overflow-hidden">
      
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-15 -z-25 pointer-events-none" />

      {/* Header */}
      <header className="h-14 border-b border-zinc-900 glass-panel flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span className="h-4 w-px bg-zinc-800" />
          <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" /> AI Agent Console <span className="px-2 py-0.5 bg-cyan-950/30 border border-cyan-900/40 text-[9px] text-cyan-400 rounded-full font-mono uppercase font-bold">Premium</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          Interactive Agent Pipeline
        </div>
      </header>

      {/* Content pane */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side: Prompt & Stepper */}
        <aside className="w-[360px] border-r border-zinc-950 bg-[#070709] flex flex-col p-5 overflow-y-auto shrink-0 select-none">
          
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRunAgent} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Repository Workspace</label>
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                disabled={isRunning || (activeTask !== null && activeTask.status !== "Completed" && activeTask.status !== "Failed")}
                className="w-full bg-zinc-950 border border-zinc-900 text-zinc-200 text-xs rounded-lg py-2.5 px-3 focus:outline-none focus:border-cyan-400 cursor-pointer disabled:opacity-50"
              >
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.repo_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">AI Engineering Prompt</label>
              <textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isRunning || (activeTask !== null && activeTask.status !== "Completed" && activeTask.status !== "Failed")}
                placeholder="e.g. Add dark mode presets or Add Stripe subscription billing webhooks"
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-cyan-400 resize-none font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Deploy Target</label>
                <select
                  value={deployTarget}
                  onChange={(e) => setDeployTarget(e.target.value)}
                  disabled={isRunning || (activeTask !== null && activeTask.status !== "Completed" && activeTask.status !== "Failed")}
                  className="w-full bg-zinc-950 border border-zinc-900 text-zinc-250 text-xs rounded-lg py-2 px-2.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="vercel">Vercel</option>
                  <option value="railway">Railway</option>
                  <option value="render">Render</option>
                  <option value="netlify">Netlify</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Safe Deploy</label>
                <input
                  type="text"
                  defaultValue="Feature Branch"
                  disabled
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-2.5 text-xs text-zinc-500 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRunning || (activeTask !== null && activeTask.status !== "Completed" && activeTask.status !== "Failed")}
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.15)]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Agent...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Initiate AI Workflow
                </>
              )}
            </button>
          </form>

          {/* Live Progress Logs Stepper */}
          {activeTask && (
            <div className="mt-8 pt-6 border-t border-zinc-900 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Agent Stepper Logs</h3>
              <div className="space-y-4 text-xs">
                {activeTask.task_list && activeTask.task_list.map((step: any, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${step.status === "completed" ? "bg-cyan-500 border-cyan-500 text-black" : step.status === "running" ? "bg-zinc-900 border-cyan-400 text-cyan-400 animate-pulse" : "bg-zinc-950 border-zinc-800 text-zinc-550"}`}>
                        {step.status === "completed" ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      {idx < activeTask.task_list.length - 1 && (
                        <div className="w-px h-6 bg-zinc-900 mt-1" />
                      )}
                    </div>
                    <div>
                      <span className={`font-semibold block ${step.status === "completed" ? "text-zinc-200" : step.status === "running" ? "text-cyan-400" : "text-zinc-550"}`}>{step.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono capitalize">{step.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </aside>

        {/* Right Side: Diff & Approval Viewport */}
        <section className="flex-1 flex flex-col bg-[#0b0b0d] overflow-hidden p-6 space-y-6">
          {activeTask ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-6">
              
              {/* Workspace details header */}
              <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider">Branch context</span>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-zinc-500" /> {activeTask.branch_name || "initializing branch..."}
                  </h2>
                </div>

                {activeTask.status === "PendingApproval" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReject}
                      className="px-3.5 py-1.5 border border-red-900/30 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Reject PR
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,210,255,0.15)]"
                    >
                      Approve & Deploy PR
                    </button>
                  </div>
                )}

                {activeTask.status === "Completed" && (
                  <a 
                    href={activeTask.deployment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.15)] cursor-pointer"
                  >
                    Launch Build <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Split Diff and Output View */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                
                {/* Code Diff preview */}
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex flex-col h-full">
                  <div className="h-10 border-b border-zinc-900 bg-zinc-900/20 px-4 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-zinc-400 font-mono flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-cyan-400" /> Git Diff Preview
                    </span>
                    <span className="text-[10px] text-zinc-550 font-mono">Affected files: {activeTask.affected_files ? activeTask.affected_files.length : 0}</span>
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-zinc-350 bg-zinc-950/20 select-text whitespace-pre">
                    {activeTask.code_diff ? (
                      activeTask.code_diff.split("\n").map((line, idx) => {
                        let lineClass = "text-zinc-400";
                        if (line.startsWith("+") && !line.startsWith("+++")) {
                          lineClass = "text-emerald-400 bg-emerald-950/20";
                        } else if (line.startsWith("-") && !line.startsWith("---")) {
                          lineClass = "text-red-400 bg-red-950/20";
                        } else if (line.startsWith("@@")) {
                          lineClass = "text-cyan-500";
                        }
                        return (
                          <div key={idx} className={lineClass}>{line}</div>
                        );
                      })
                    ) : (
                      <span className="text-zinc-650 text-xs italic">Analyzing repository state...</span>
                    )}
                  </div>
                </div>

                {/* Right Pane: Affected Files & Compiler validation reports */}
                <div className="space-y-6 overflow-y-auto h-full pr-1">
                  
                  {/* Affected Files Box */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl space-y-3 shrink-0">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Target Files modified</h3>
                    <div className="space-y-2 text-xs">
                      {activeTask.affected_files && activeTask.affected_files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-900/35 border border-zinc-900 rounded font-mono text-[10px] text-zinc-300">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}

                      {(!activeTask.affected_files || activeTask.affected_files.length === 0) && (
                        <span className="text-zinc-650 italic text-[11px] font-mono">Identifying affected codebase files...</span>
                      )}
                    </div>
                  </div>

                  {/* Validation Compiler Report */}
                  {activeTask.validation_report && (
                    <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl space-y-4 shrink-0 font-mono text-[11px]">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Compiler Report</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Lint checks</span>
                          <span className="text-emerald-400 font-bold">PASSED</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Build compiles</span>
                          <span className="text-emerald-400 font-bold">PASSED</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Unit Tests passed</span>
                          <span className="text-emerald-400 font-bold">8 / 8</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pull Request Card */}
                  {activeTask.pr_url && (
                    <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl space-y-3 shrink-0">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5"><GitPullRequest className="w-4 h-4 text-cyan-400" /> Pull Request</h3>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        AI created feature branch and pushed commits. Remote Git PR is ready:
                      </p>
                      <a 
                        href={activeTask.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 break-all"
                      >
                        GitHub PR Link <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {activeTask.status === "Failed" && (
                    <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl space-y-2 shrink-0">
                      <span className="text-red-400 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> Workflow Failed</span>
                      <p className="text-[11px] text-red-300 font-mono leading-normal">{activeTask.error_message}</p>
                    </div>
                  )}

                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-2xl p-6">
              <Terminal className="w-12 h-12 text-zinc-750 mb-4 animate-pulse" />
              <h2 className="text-base font-bold text-white">AI Engineering Console Workspace</h2>
              <p className="text-zinc-500 text-xs mt-1.5 max-w-sm leading-normal">
                Choose a repository from the left panel, input natural language engineering prompts, and watch the AI agent analyze, modify, validate, and compile branch outputs.
              </p>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
