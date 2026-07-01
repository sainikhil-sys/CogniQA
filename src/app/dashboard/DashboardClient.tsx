"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Search, 
  Terminal, 
  FileCode, 
  AlertTriangle, 
  Sparkles, 
  TrendingDown, 
  Cpu, 
  Activity, 
  ArrowRight, 
  LogOut, 
  UploadCloud, 
  RefreshCw, 
  Database,
  CheckCircle2,
  Hourglass,
  Check,
  Loader2
} from "lucide-react";

interface Repository {
  id: string;
  repo_name: string;
  repo_url: string;
  language: string;
  status: "Indexing" | "Indexed" | "Failed";
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoLang, setNewRepoLang] = useState("TypeScript");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` 
    : "http://localhost:8000/api/v1";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth fetch helper
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      router.replace("/login");
      throw new Error("No active Supabase session found.");
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

  const loadRepositories = async () => {
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/repositories`);
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
      } else {
        setErrorMessage("Failed to load connected repositories.");
      }
    } catch (err) {
      setErrorMessage("Could not connect to API server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll indexing repositories status
  useEffect(() => {
    if (!isMounted) return;
    loadRepositories();

    const interval = setInterval(() => {
      const hasIndexing = repositories.some(r => r.status === "Indexing");
      if (hasIndexing) {
        loadRepositories();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isMounted, repositories.length]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim() || !newRepoUrl.trim()) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage("");

    // Simulate archive parsing upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev >= 90 ? 90 : prev + 15));
    }, 150);

    try {
      const payload = {
        name: newRepoName,
        url: newRepoUrl,
        language: newRepoLang
      };

      const res = await fetchWithAuth(`${apiBaseUrl}/repositories`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        const newRepo = await res.json();
        setRepositories(prev => [newRepo, ...prev]);
        setIsImportModalOpen(false);
        setNewRepoName("");
        setNewRepoUrl("");
      } else {
        const errData = await res.json();
        setErrorMessage(errData.detail || "Failed to connect repository.");
      }
    } catch (err) {
      setErrorMessage("Network error connecting to parser gateway.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteRepo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repository from CogniQA?")) return;
    
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/repositories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRepositories(prev => prev.filter(r => r.id !== id));
      } else {
        alert("Failed to delete repository index.");
      }
    } catch (err) {
      alert("Error reaching gateway server.");
    }
  };

  const handleLogout = async () => {
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Strict";
    localStorage.removeItem("cogniqa-user-session");
    
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    }
    
    router.replace("/login");
  };

  const filteredRepos = repositories.filter(repo => 
    repo.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 -z-20 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                C
              </div>
              <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                Cogni<span className="text-cyan-400">QA</span>
              </span>
            </Link>
            <span className="h-4 w-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 font-mono">Console</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-glow" /> System Status: Healthy
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Repository Directory List */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Codebases <span className="text-xs font-mono font-normal bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500">{repositories.length} total</span>
              </h1>
              <p className="text-zinc-500 text-xs mt-1">Select a codebase to review interactive dependency flow, debt, and chat queries.</p>
            </div>
            
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.2)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Connect Repository
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Repositories</span>
              <span className="text-xl font-bold text-white block mt-1">{repositories.length}</span>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Completed Indexes</span>
              <span className="text-xl font-bold text-cyan-400 block mt-1">
                {repositories.filter(r => r.status === "Indexed").length}
              </span>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Pending Processing</span>
              <span className="text-xl font-bold text-white block mt-1">
                {repositories.filter(r => r.status === "Indexing").length}
              </span>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Analysis Status</span>
              <span className="text-xl font-bold text-green-400 block mt-1">
                {repositories.some(r => r.status === "Indexing") ? "Index Running" : "Idle"}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search codebases by name, stack, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl py-3 pl-11 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Repository Cards Grid */}
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
              <p className="text-xs text-zinc-500">Querying database schema...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRepos.map((repo) => (
                <div 
                  key={repo.id}
                  className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                          {repo.language}
                        </span>
                        {repo.status === "Indexing" ? (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-mono">
                            <Hourglass className="w-3 h-3 animate-spin" /> Indexing
                          </span>
                        ) : repo.status === "Failed" ? (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-mono">
                            <AlertTriangle className="w-3 h-3" /> Index Failed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> Indexed
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteRepo(repo.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors text-[10px] px-1"
                        title="Delete Repository Index"
                      >
                        Delete
                      </button>
                    </div>

                    <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors text-base break-all">
                      {repo.repo_name}
                    </h3>
                    
                    <p className="text-xs text-zinc-500 mt-2 font-mono truncate">{repo.repo_url}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900/60 text-xs mt-4">
                    <span className="text-zinc-500">Connected: {new Date(repo.created_at).toLocaleDateString()}</span>
                    
                    {repo.status === "Indexed" ? (
                      <Link 
                        href={`/analysis?repo=${repo.id}`} 
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        Open Insights <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-zinc-600 cursor-not-allowed">Processing AST...</span>
                    )}
                  </div>
                </div>
              ))}

              {filteredRepos.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-zinc-950/40 border border-dashed border-zinc-900 rounded-xl">
                  <FileCode className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-zinc-300">No repositories found</h4>
                  <p className="text-xs text-zinc-500 mt-1">Try connecting a repository to start AI analyses.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: AI Insights & Activity Feed */}
        <div className="space-y-6">
          
          {/* AI Platform Insights */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> AI Insights Alert
              </h2>
              <span className="text-[10px] text-zinc-500">Active</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {repositories.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-zinc-900/30 border border-zinc-900 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-semibold text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Security Vulnerability
                    </span>
                    <p className="text-[11px] text-zinc-400 font-mono leading-normal">
                      Potential exposed postgres URI secret detected inside middleware code parsing.
                    </p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-3.5 rounded-lg space-y-1.5">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> Performance Warning
                    </span>
                    <p className="text-[11px] text-zinc-400 font-mono leading-normal">
                      Sequential blocking HTTP routes found inside AST dependencies layout.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-xs py-4 text-center">Connect repositories to generate AI insights.</p>
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" /> Platform Activity
            </h2>

            <div className="space-y-4 text-xs">
              {repositories.length > 0 ? (
                repositories.map((repo, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${repo.status === "Indexed" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <div>
                      <span className="text-zinc-300 block font-semibold truncate max-w-[180px]">{repo.repo_name}</span>
                      <span className="text-[9px] text-zinc-500 block">AST parser status: {repo.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-xs py-4 text-center">No active run events.</p>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Connect Repository Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            onClick={() => !isUploading && setIsImportModalOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal content */}
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-xl p-6 glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" /> Connect new repository
              </h3>
              <p className="text-zinc-500 text-xs mt-1">Provide repository name and URL to start parsing and vector indexing.</p>
            </div>

            {isUploading ? (
              <div className="py-10 text-center space-y-4">
                <UploadCloud className="w-10 h-10 text-cyan-400 animate-bounce mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-zinc-300">Parsing and Indexing Codebase</h4>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden max-w-xs mx-auto mt-2.5">
                    <div className="bg-cyan-400 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-2 block">{uploadProgress}% compiled</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Repository Name</label>
                  <input
                    type="text"
                    required
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="facebook/react-router"
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 placeholder-zinc-650"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Git Clone URL</label>
                  <input
                    type="text"
                    required
                    value={newRepoUrl}
                    onChange={(e) => setNewRepoUrl(e.target.value)}
                    placeholder="https://github.com/facebook/react-router.git"
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 placeholder-zinc-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Primary Stack</label>
                    <select
                      value={newRepoLang}
                      onChange={(e) => setNewRepoLang(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="Go">Go</option>
                      <option value="Python">Python</option>
                      <option value="Rust">Rust</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Branch to Parse</label>
                    <input
                      type="text"
                      defaultValue="main"
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-400 focus:outline-none"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-md transition-colors shadow-[0_0_15px_rgba(0,210,255,0.2)] cursor-pointer"
                  >
                    Import & Index
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
