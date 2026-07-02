"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  Loader2, 
  Activity, 
  Cpu, 
  Database, 
  Users, 
  FileCode, 
  CheckCircle,
  AlertTriangle,
  HardDrive
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

interface StatsMetrics {
  total_users: number;
  total_repositories: number;
  completed_analyses: number;
  platform_health_score: number;
}

interface DiagnosticSystem {
  platform: string;
  python_version: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  memory_available_mb: number;
}

export default function AdminClient() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);

  const [metrics, setMetrics] = useState<StatsMetrics | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const [dbStatus, setDbStatus] = useState("checking");
  const [sentryStatus, setSentryStatus] = useState("active");
  const [sysDetails, setSysDetails] = useState<DiagnosticSystem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
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

  const loadAdminTelemetry = async () => {
    setErrorMessage("");
    try {
      // 1. Fetch statistics
      const statsRes = await fetchWithAuth(`${apiBaseUrl}/admin/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMetrics(statsData.metrics);
        setActivityLogs(statsData.recent_activity);
      } else {
        throw new Error("Failed to load admin stats. Verification failed.");
      }

      // 2. Fetch diagnostics
      const healthRes = await fetchWithAuth(`${apiBaseUrl}/admin/health`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setDbStatus(healthData.database);
        setSentryStatus(healthData.sentry);
        setSysDetails(healthData.system);
      }
    } catch (err) {
      setErrorMessage("Handshake rejected. Insufficient administrator credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadAdminTelemetry();
  }, [isMounted]);

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
            <span className="text-xs text-zinc-500 font-mono">Administrator Command Center</span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-glow" /> Telemetry Mode: Active
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        
        {errorMessage && (
          <div className="p-4 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <p className="text-zinc-500 text-xs mt-3">Establishing handshake with platform control panel...</p>
          </div>
        ) : metrics && (
          <div className="space-y-8">
            
            {/* Stats Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" /> Registered Profiles
                </span>
                <span className="text-3xl font-extrabold text-white block">{metrics.total_users}</span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-blue-400" /> Connect Repositories
                </span>
                <span className="text-3xl font-extrabold text-white block">{metrics.total_repositories}</span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-yellow-400" /> Compiled Analyses
                </span>
                <span className="text-3xl font-extrabold text-white block">{metrics.completed_analyses}</span>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-400" /> Codebase Health Avg
                </span>
                <span className="text-3xl font-extrabold text-white block">{metrics.platform_health_score}%</span>
              </div>
            </div>

            {/* Grid for activity log & diagnostics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Diagnostics */}
              <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Platform Health Indicators</h3>
                  <p className="text-zinc-500 text-[10px] mt-0.5">Real-time gateway connections and server diagnostics.</p>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-900 rounded-lg">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Database className="w-4 h-4" /> Postgres Database</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${dbStatus === "connected" ? "bg-emerald-950/30 border border-emerald-900/40 text-emerald-400" : "bg-red-950/30 border border-red-900/40 text-red-400"}`}>
                      {dbStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-900 rounded-lg">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Activity className="w-4 h-4" /> Sentry Observability</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/30 border border-emerald-900/40 text-emerald-400">
                      {sentryStatus}
                    </span>
                  </div>
                </div>

                {sysDetails && (
                  <div className="space-y-4 pt-6 border-t border-zinc-900">
                    <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider font-mono">Server CPU & Memory</h4>
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 font-mono mb-1">
                          <span>CPU Capacity</span>
                          <span>{sysDetails.cpu_usage_percent}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-400 h-full transition-all" style={{ width: `${sysDetails.cpu_usage_percent}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 font-mono mb-1">
                          <span>Memory Occupied</span>
                          <span>{sysDetails.memory_usage_percent}%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-400 h-full transition-all" style={{ width: `${sysDetails.memory_usage_percent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Platform Action Logs */}
              <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Aggregated Platform Activity Logs</h3>
                  <p className="text-zinc-500 text-[10px] mt-0.5">Real-time system events captured by RLS tables.</p>
                </div>

                <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20">
                  <table className="w-full border-collapse text-left text-xs text-zinc-400">
                    <thead className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase font-mono">
                      <tr>
                        <th className="px-4 py-3">Actor ID</th>
                        <th className="px-4 py-3">Trigger Action</th>
                        <th className="px-4 py-3">Telemetry Details</th>
                        <th className="px-4 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                      {activityLogs.map(log => (
                        <tr key={log.id} className="hover:bg-zinc-900/10">
                          <td className="px-4 py-3 text-zinc-500 truncate max-w-[80px]" title={log.user_id}>{log.user_id}</td>
                          <td className="px-4 py-3 font-semibold text-zinc-300">{log.action}</td>
                          <td className="px-4 py-3 text-zinc-400 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                          <td className="px-4 py-3 text-zinc-650">{new Date(log.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}

                      {activityLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-550">
                            No logs captured in current period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
