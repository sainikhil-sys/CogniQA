"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  User, 
  Settings, 
  Key, 
  Globe, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ArrowLeft, 
  Loader2, 
  Activity 
} from "lucide-react";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
}

interface Integration {
  id: string;
  provider: string;
  status: string;
  created_at: string;
}

export default function SettingsClient() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "integrations" | "keys">("profile");
  
  // Profile State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");

  // Integrations State
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("github");
  const [integrationToken, setIntegrationToken] = useState("");
  const [isConnectingInteg, setIsConnectingInteg] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKeyVal, setGeneratedKeyVal] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const loadSettingsData = async () => {
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings`);
      if (res.ok) {
        const data = await res.json();
        setEmail(data.profile.email);
        setFullName(data.profile.full_name);
        setIntegrations(data.integrations);
        setApiKeys(data.api_keys);
      } else {
        setErrorMessage("Failed to load settings data.");
      }
    } catch (err) {
      setErrorMessage("Could not connect to the settings backend gateway.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadSettingsData();
  }, [isMounted]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess("");
    setErrorMessage("");

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings/profile`, {
        method: "PUT",
        body: JSON.stringify({ full_name: fullName })
      });

      if (res.ok) {
        setProfileSuccess("Profile metadata updated successfully.");
      } else {
        setErrorMessage("Failed to save profile changes.");
      }
    } catch (err) {
      setErrorMessage("Network error updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationToken.trim()) return;

    setIsConnectingInteg(true);
    setErrorMessage("");

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings/integrations`, {
        method: "POST",
        body: JSON.stringify({
          provider: selectedProvider,
          token: integrationToken
        })
      });

      if (res.ok) {
        setIsConnectModalOpen(false);
        setIntegrationToken("");
        loadSettingsData();
      } else {
        setErrorMessage("Could not register integration handshake.");
      }
    } catch (err) {
      setErrorMessage("Connection gateway timed out.");
    } finally {
      setIsConnectingInteg(false);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Disconnect this integration? This cancels active webhook updates.")) return;

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings/integrations/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setIntegrations(prev => prev.filter(item => item.id !== id));
      } else {
        alert("Failed to disconnect integration.");
      }
    } catch (err) {
      alert("Error contacting settings router.");
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsGeneratingKey(true);
    setErrorMessage("");

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings/keys`, {
        method: "POST",
        body: JSON.stringify({ name: newKeyName })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKeyVal(data.api_key);
        setIsKeyModalOpen(true);
        setNewKeyName("");
        loadSettingsData();
      } else {
        setErrorMessage("Could not compile developer token.");
      }
    } catch (err) {
      setErrorMessage("API gateway handshake failed.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKeyVal);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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
            <span className="text-xs text-zinc-500 font-mono">Console Settings</span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/billing"
              className="text-xs text-zinc-400 hover:text-white transition-colors font-mono"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sub-Navigation Pane */}
        <aside className="space-y-2">
          <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" /> Settings Panel
            </h2>
            <p className="text-zinc-500 text-[10px] mt-1">Configure profile configurations and secure key integrations.</p>
          </div>

          <nav className="flex flex-col gap-1 text-xs">
            <button
              onClick={() => setActiveSubTab("profile")}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "profile" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <User className="w-4 h-4" /> Personal Profile
            </button>
            <button
              onClick={() => setActiveSubTab("integrations")}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "integrations" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <Globe className="w-4 h-4" /> OAuth Integrations
            </button>
            <button
              onClick={() => setActiveSubTab("keys")}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "keys" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <Key className="w-4 h-4" /> Developer API Keys
            </button>
          </nav>
        </aside>

        {/* Right Content Pane */}
        <div className="lg:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-xl p-6 lg:p-8 space-y-6">
          
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
            <>
              {/* SUB TAB: Profile */}
              {activeSubTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Profile Configurations</h2>
                    <p className="text-zinc-500 text-xs mt-1">Configure your personal identification parameters.</p>
                  </div>

                  {profileSuccess && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-400 font-mono">
                      {profileSuccess}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                    <div>
                      <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Email Account</label>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? "Saving Updates..." : "Save Settings"}
                    </button>
                  </form>
                </div>
              )}

              {/* SUB TAB: Integrations */}
              {activeSubTab === "integrations" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-white">OAuth Gateways</h2>
                      <p className="text-zinc-500 text-xs mt-1">Connect repository pipelines and deployment targets.</p>
                    </div>
                    <button
                      onClick={() => setIsConnectModalOpen(true)}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Connection
                    </button>
                  </div>

                  <div className="space-y-3">
                    {integrations.map(integ => (
                      <div 
                        key={integ.id}
                        className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-300">
                            {integ.provider === "github" ? <Globe className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="font-semibold text-sm capitalize text-white">{integ.provider} Pipeline</span>
                            <span className="text-[10px] text-zinc-500 block font-mono">Status: {integ.status}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteIntegration(integ.id)}
                          className="p-1.5 text-zinc-650 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {integrations.length === 0 && (
                      <div className="py-8 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl">
                        <p className="text-zinc-500 text-xs font-mono">No active integration gateways connected.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB TAB: API Keys */}
              {activeSubTab === "keys" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Developer API Keys</h2>
                    <p className="text-zinc-500 text-xs mt-1">Generate API tokens for continuous integration webhooks.</p>
                  </div>

                  <form onSubmit={handleGenerateKey} className="flex gap-3 max-w-md items-end">
                    <div className="flex-1">
                      <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Key Label</label>
                      <input
                        type="text"
                        required
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Jenkins Webhook"
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGeneratingKey}
                      className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer h-9 shrink-0"
                    >
                      {isGeneratingKey ? "Generating..." : "Generate Key"}
                    </button>
                  </form>

                  <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20">
                    <table className="w-full border-collapse text-left text-xs text-zinc-400">
                      <thead className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase font-mono">
                        <tr>
                          <th className="px-4 py-3">Label</th>
                          <th className="px-4 py-3">Prefix Token</th>
                          <th className="px-4 py-3">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {apiKeys.map(key => (
                          <tr key={key.id} className="hover:bg-zinc-900/20">
                            <td className="px-4 py-3 font-semibold text-zinc-300">{key.name}</td>
                            <td className="px-4 py-3 font-mono text-[11px]">{key.prefix}</td>
                            <td className="px-4 py-3 text-zinc-500 font-mono">{new Date(key.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}

                        {apiKeys.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 font-mono">
                              No generated developer API keys found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Connect Integration Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsConnectModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl p-6 glass-panel shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Connect Integration Gateway</h3>
            <form onSubmit={handleConnectIntegration} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">Service Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200"
                >
                  <option value="github">GitHub Workspace</option>
                  <option value="vercel">Vercel Deployment</option>
                  <option value="netlify">Netlify Deployment</option>
                  <option value="railway">Railway Backend</option>
                  <option value="render">Render Cloud</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">API Access Token / Token Secret</label>
                <input
                  type="password"
                  required
                  value={integrationToken}
                  onChange={(e) => setIntegrationToken(e.target.value)}
                  placeholder="Paste access key token here"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-3.5 py-1.5 border border-zinc-800 text-zinc-400 text-xs rounded-md cursor-pointer hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingInteg}
                  className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-md cursor-pointer disabled:opacity-50"
                >
                  {isConnectingInteg ? "Connecting..." : "Handshake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsKeyModalOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-xl p-6 glass-panel shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">API Key Generated Successfully</h3>
            <p className="text-zinc-500 text-xs leading-normal mb-4">
              Copy this developer token now. For security purposes, it will never be displayed in plain text in the dashboard settings again.
            </p>

            <div className="bg-zinc-900/60 border border-zinc-850 p-3.5 rounded-lg flex items-center justify-between gap-4 font-mono text-xs text-cyan-400 break-all select-all">
              <span>{generatedKeyVal}</span>
              <button 
                onClick={handleCopyKey} 
                className="shrink-0 p-1.5 bg-zinc-950 border border-zinc-800 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Key"
              >
                {copiedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end pt-5 mt-5 border-t border-zinc-900">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
