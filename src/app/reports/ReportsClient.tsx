"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Download, 
  AlertTriangle, 
  Activity, 
  Zap, 
  Database,
  TrendingDown,
  ChevronDown
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface Repository {
  id: string;
  repo_name: string;
  repo_url: string;
  language: string;
  status: string;
}

interface ReportStats {
  repo_id: string;
  health_score: number;
  complexity_score: number;
  security_score: number;
  tech_debt_score: number;
  duplicate_code_percent: number;
  dead_code_count: number;
  vulnerabilities: any[];
}

export default function ReportsClient() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [report, setReport] = useState<ReportStats | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
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
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportDetails = async (repoId: string) => {
    if (!repoId) return;
    setIsReportLoading(true);
    setErrorMessage("");
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/reports/${repoId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        setErrorMessage("Failed to load report analytics.");
      }
    } catch (err) {
      setErrorMessage("Failed to compile analysis report.");
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadConnectedRepositories();
  }, [isMounted]);

  useEffect(() => {
    if (selectedRepoId) {
      loadReportDetails(selectedRepoId);
    }
  }, [selectedRepoId]);

  const handleExportCSV = () => {
    if (!report) return;
    
    const activeRepo = repositories.find(r => r.id === selectedRepoId);
    const repoName = activeRepo ? activeRepo.repo_name : "codebase";

    const csvContent = [
      ["Metric Category", "Score Value (0-100 / Count)"],
      ["Health Index Rating", `${report.health_score}%`],
      ["Cyclomatic Complexity", `${report.complexity_score}/100`],
      ["Security Auditing Score", `${report.security_score}/100`],
      ["Technical Debt Score", `${report.tech_debt_score}/100`],
      ["Duplicated Code Percentage", `${report.duplicate_code_percent}%`],
      ["Identified Dead Code Blocks", report.dead_code_count]
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cogniqa-report-${repoName.replace("/", "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportText = () => {
    if (!report) return;

    const activeRepo = repositories.find(r => r.id === selectedRepoId);
    const repoName = activeRepo ? activeRepo.repo_name : "codebase";

    const docText = `========================================================================
COGNIOA SYSTEMS CODEBASE REPORT
========================================================================
Repository Connected Name: ${repoName}
Export Generated Date:     ${new Date().toLocaleString()}
System Health Rating:      ${report.health_score}%

INTELLIGENCE RATINGS SUMMARY:
------------------------------------------------------------------------
* Cyclomatic Complexity Index:   ${report.complexity_score}/100
* Security Vulnerabilities Rating: ${report.security_score}/100
* Technical Debt Score:           ${report.tech_debt_score}/100
* Duplicated Statements Percent:  ${report.duplicate_code_percent}%
* Inactive / Dead Code Blocks:     ${report.dead_code_count}

RECOMMENDATIONS FOR IMPROVEMENT:
------------------------------------------------------------------------
1. Refactor file functions exceeding cyclomatic complexity baseline (>25).
2. Resolve potential Postgres credential secrets flagged inside AST parameters.
3. Clean circular imports detected in middleware file connections.

========================================================================
Generated via CogniQA Systems AI Code Intelligence Engine.
https://cogniqa.systems
========================================================================`;

    const blob = new Blob([docText], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cogniqa-report-${repoName.replace("/", "-")}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const radarData = report ? [
    { subject: "Security", score: report.security_score },
    { subject: "Complexity", score: 100 - report.complexity_score },
    { subject: "Maintenance", score: 100 - report.tech_debt_score },
    { subject: "Duplicates", score: 100 - report.duplicate_code_percent * 8 },
    { subject: "Clean Code", score: 100 - report.dead_code_count * 5 }
  ] : [];

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-15 -z-25 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="h-4 w-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 font-mono">Reports Hub</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        
        {errorMessage && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Toolbar Selector */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Codebase Intelligence Exporter
                </h1>
                <p className="text-zinc-500 text-xs">Choose repository index to download code health sheets.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-200 text-xs rounded-lg py-2.5 pl-3.5 pr-8 focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none min-w-[200px]"
                  >
                    {repositories.map(repo => (
                      <option key={repo.id} value={repo.id}>
                        {repo.repo_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={!report || isReportLoading}
                  className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>

                <button
                  onClick={handleExportText}
                  disabled={!report || isReportLoading}
                  className="px-3.5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.15)] disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Export PDF/TXT
                </button>
              </div>
            </div>

            {/* Content view */}
            {isReportLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                <p className="text-zinc-500 text-xs mt-3">Compiling dynamic metrics chart...</p>
              </div>
            ) : report ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Panel: Health Gauge */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between items-center text-center space-y-6">
                  <div>
                    <h3 className="font-bold text-zinc-300 text-sm">Workspace Health Index</h3>
                    <p className="text-zinc-550 text-[10px] mt-0.5">Calculated based on complexity, lints, and tech debt.</p>
                  </div>

                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[10px] border-zinc-900" />
                    <div 
                      className="absolute inset-0 rounded-full border-[10px] border-cyan-400 transition-all duration-500" 
                      style={{
                        clipPath: `polygon(50% 50%, -50% -50%, ${report.health_score >= 50 ? "150% -50%" : "50% -50%"}, ${report.health_score >= 75 ? "150% 150%" : "150% -50%"}, ${report.health_score >= 100 ? "-50% 150%" : "150% 150%"}, 50% 50%)`
                      }}
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-5xl font-extrabold text-white tracking-tight">{report.health_score}</span>
                      <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase font-bold mt-1">Excellent</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-zinc-900">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">Lints Passed</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">100%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">Unmapped Code</span>
                      <span className="text-sm font-semibold text-white block mt-0.5">{report.duplicate_code_percent}%</span>
                    </div>
                  </div>
                </div>

                {/* Center Panel: Radar Diagnostic Chart */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between lg:col-span-2">
                  <div>
                    <h3 className="font-bold text-zinc-300 text-sm">Platform Health Vectors</h3>
                    <p className="text-zinc-550 text-[10px] mt-0.5">Code metrics mapped across 5 dimensions.</p>
                  </div>

                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#1f1f23" />
                        <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#3f3f46" fontSize={9} />
                        <Radar name="Codebase score" dataKey="score" stroke="#00d2ff" fill="#00d2ff" fillOpacity={0.15} />
                        <Tooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid #1f1f23", fontSize: 11 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex justify-around pt-4 border-t border-zinc-900 text-center text-xs">
                    <div>
                      <span className="text-zinc-550 text-[10px] uppercase font-bold">Complexity</span>
                      <span className="text-sm font-semibold text-yellow-400 block mt-0.5">{report.complexity_score}/100</span>
                    </div>
                    <div>
                      <span className="text-zinc-550 text-[10px] uppercase font-bold">Tech Debt</span>
                      <span className="text-sm font-semibold text-red-400 block mt-0.5">{report.tech_debt_score}/100</span>
                    </div>
                    <div>
                      <span className="text-zinc-550 text-[10px] uppercase font-bold">Security Score</span>
                      <span className="text-sm font-semibold text-emerald-400 block mt-0.5">{report.security_score}/100</span>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="py-20 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl">
                <FileText className="w-10 h-10 text-zinc-650 mx-auto mb-3" />
                <p className="text-zinc-500 text-xs font-mono">Select a codebase to retrieve report diagnostics.</p>
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}
