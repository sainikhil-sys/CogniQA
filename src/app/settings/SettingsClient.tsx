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
  Shield, 
  Users, 
  Building2, 
  Lock, 
  Unlock, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { 
  createOrganization, 
  inviteMember, 
  getOrganizationData, 
  createTeam, 
  getUserOrganizations,
  OrgMemberData,
  OrgInvitationData,
  TeamData
} from "../../features/orgs/actions";
import { UserRole } from "../../features/auth/permissions";

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

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsClient() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "organization" | "mfa" | "integrations" | "keys">("profile");
  
  // Base State
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Profile State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Organization State
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgRole, setOrgRole] = useState<UserRole | null>(null);
  const [members, setMembers] = useState<OrgMemberData[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitationData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [isLoadingOrgDetails, setIsLoadingOrgDetails] = useState(false);
  
  // Organization Input Fields
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // MFA State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCodeInput, setMfaCodeInput] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

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
    setIsLoading(true);
    setErrorMessage("");
    try {
      // 1. Get profile & backend options
      const res = await fetchWithAuth(`${apiBaseUrl}/settings`);
      if (res.ok) {
        const data = await res.json();
        setEmail(data.profile.email);
        setFullName(data.profile.full_name);
        setIntegrations(data.integrations);
        setApiKeys(data.api_keys);
      } else {
        setErrorMessage("Failed to load profile settings.");
      }

      // 2. Load User Organizations
      const userOrgs = await getUserOrganizations();
      setOrgs(userOrgs);
      if (userOrgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(userOrgs[0].id);
      }

      // 3. Load MFA status
      await fetchMfaStatus();

    } catch (err) {
      setErrorMessage("Could not connect to settings gateway.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loads organization specific sub-entities
  const loadOrgDetails = async (orgId: string) => {
    if (!orgId) return;
    setIsLoadingOrgDetails(true);
    try {
      const data = await getOrganizationData(orgId);
      setOrgRole(data.role ?? null);
      setMembers(data.members);
      setInvitations(data.invitations);
      setTeams(data.teams);
    } catch (err: any) {
      console.error("Failed to load organization data:", err);
    } finally {
      setIsLoadingOrgDetails(false);
    }
  };

  // Load MFA factors using Supabase Auth
  const fetchMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data.all || []);
    } catch (mfaErr) {
      console.warn("Could not query MFA factors:", mfaErr);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadSettingsData();
  }, [isMounted]);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgDetails(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Profile Management
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/settings/profile`, {
        method: "PUT",
        body: JSON.stringify({ full_name: fullName })
      });

      if (res.ok) {
        setSuccessMessage("Profile display name updated successfully.");
      } else {
        setErrorMessage("Failed to save profile changes.");
      }
    } catch (err) {
      setErrorMessage("Network error updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Create organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;

    setIsCreatingOrg(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const createdOrg = await createOrganization(newOrgName, newOrgSlug.toLowerCase().replace(/\s+/g, "-"));
      setSuccessMessage(`Organization "${createdOrg.name}" created successfully.`);
      setNewOrgName("");
      setNewOrgSlug("");
      
      // Reload organization dropdown and set active
      const userOrgs = await getUserOrganizations();
      setOrgs(userOrgs);
      setSelectedOrgId(createdOrg.id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create organization.");
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // Send organization invitation
  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !inviteEmail.trim()) return;

    setIsInviting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await inviteMember(selectedOrgId, inviteEmail, inviteRole);
      setSuccessMessage(`Invitation sent to ${inviteEmail} successfully.`);
      setInviteEmail("");
      loadOrgDetails(selectedOrgId);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  // Create team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !newTeamName.trim()) return;

    setIsCreatingTeam(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const createdTeam = await createTeam(selectedOrgId, newTeamName);
      setSuccessMessage(`Team "${createdTeam.name}" created successfully.`);
      setNewTeamName("");
      loadOrgDetails(selectedOrgId);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create team.");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // MFA Enrollment Flow
  const handleEnrollMfa = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsEnrollingMfa(true);

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "CogniQA Systems"
      });

      if (error) throw error;

      setMfaFactorId(data.id);
      setMfaSecret(data.totp.secret);
      setMfaQrCode(data.totp.qr_code);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not generate MFA enrollment credentials.");
      setIsEnrollingMfa(false);
    }
  };

  const getQrSrc = (qr: string) => {
    if (qr.startsWith("data:image/svg+xml")) return qr;
    if (qr.startsWith("<svg")) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
    }
    return qr;
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCodeInput || !mfaFactorId) return;

    setIsVerifyingMfa(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId
      });

      if (challengeError) throw challengeError;

      // Verify
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCodeInput
      });

      if (verifyError) throw verifyError;

      setSuccessMessage("Multi-Factor Authentication enabled successfully!");
      setMfaCodeInput("");
      setMfaFactorId("");
      setMfaQrCode("");
      setMfaSecret("");
      setIsEnrollingMfa(false);
      await fetchMfaStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed. Check the token and try again.");
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    if (!confirm("Are you sure you want to disable Multi-Factor Authentication?")) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });

      if (error) throw error;

      setSuccessMessage("MFA Factor disabled successfully.");
      await fetchMfaStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to disable MFA factor.");
    }
  };

  // Connect Integrations (existing code compatibility)
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
              onClick={() => { setActiveSubTab("profile"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "profile" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <User className="w-4 h-4" /> Personal Profile
            </button>
            <button
              onClick={() => { setActiveSubTab("organization"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "organization" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <Building2 className="w-4 h-4" /> Organization settings
            </button>
            <button
              onClick={() => { setActiveSubTab("mfa"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "mfa" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <Shield className="w-4 h-4" /> Security & MFA
            </button>
            <button
              onClick={() => { setActiveSubTab("integrations"); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-left cursor-pointer transition-all ${activeSubTab === "integrations" ? "bg-zinc-900 text-cyan-400 border border-zinc-800" : "hover:bg-zinc-900/50 text-zinc-400"}`}
            >
              <Globe className="w-4 h-4" /> OAuth Integrations
            </button>
            <button
              onClick={() => { setActiveSubTab("keys"); setErrorMessage(""); setSuccessMessage(""); }}
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

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-400 font-mono">
              {successMessage}
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

              {/* SUB TAB: Organization */}
              {activeSubTab === "organization" && (
                <div className="space-y-8">
                  {/* Select Active Organization */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Organization Settings</h2>
                      <p className="text-zinc-500 text-xs mt-1">Manage team members, roles, permissions, and segments.</p>
                    </div>

                    {orgs.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 font-mono">Active Workspace:</span>
                        <select
                          value={selectedOrgId}
                          onChange={(e) => setSelectedOrgId(e.target.value)}
                          className="bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 font-semibold"
                        >
                          {orgs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.slug})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {orgs.length === 0 ? (
                    /* Empty State: Create Organization */
                    <div className="max-w-md bg-zinc-950/60 border border-zinc-900 p-6 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Building2 className="w-5 h-5" />
                        <h3 className="text-sm font-bold text-white">Create your first organization</h3>
                      </div>
                      <p className="text-zinc-500 text-xs leading-normal">
                        To collaborate with team members and connect repositories, you must first create an organization context.
                      </p>

                      <form onSubmit={handleCreateOrg} className="space-y-3 pt-2">
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono uppercase block mb-1">Org Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Acme Corp"
                            value={newOrgName}
                            onChange={(e) => {
                              setNewOrgName(e.target.value);
                              setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                            }}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 font-mono uppercase block mb-1">Slug URL</label>
                          <input
                            type="text"
                            required
                            placeholder="acme-corp"
                            value={newOrgSlug}
                            onChange={(e) => setNewOrgSlug(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingOrg}
                          className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCreatingOrg ? "Creating..." : "Create Organization"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Full Org Dashboard */
                    <div className="space-y-8">
                      {isLoadingOrgDetails ? (
                        <div className="py-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          
                          {/* Column 1 & 2: Member management */}
                          <div className="lg:col-span-2 space-y-6">
                            
                            {/* Member list */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyan-400" /> Active Members ({members.length})
                              </h3>

                              <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20">
                                <table className="w-full border-collapse text-left text-xs">
                                  <thead className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-mono text-[9px] uppercase">
                                    <tr>
                                      <th className="px-4 py-2.5">Name</th>
                                      <th className="px-4 py-2.5">Email</th>
                                      <th className="px-4 py-2.5">Role</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                                    {members.map((m) => (
                                      <tr key={m.id} className="hover:bg-zinc-900/10">
                                        <td className="px-4 py-3 font-semibold text-white">{m.user?.full_name || "Engineering Member"}</td>
                                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">{m.user?.email}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${m.role === "owner" ? "bg-red-950/30 border border-red-900/30 text-red-400" : m.role === "admin" ? "bg-amber-950/30 border border-amber-900/30 text-amber-400" : "bg-cyan-950/30 border border-cyan-900/30 text-cyan-400"}`}>
                                            {m.role}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Pending Invitations list */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Plus className="w-4 h-4 text-zinc-500" /> Pending Team Invitations ({invitations.length})
                              </h3>

                              {invitations.length === 0 ? (
                                <div className="p-4 border border-dashed border-zinc-900 rounded-xl text-center text-zinc-500 text-xs font-mono">
                                  No pending email invitations.
                                </div>
                              ) : (
                                <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20">
                                  <table className="w-full border-collapse text-left text-xs">
                                    <thead className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-mono text-[9px] uppercase">
                                      <tr>
                                        <th className="px-4 py-2.5">Invitee Email</th>
                                        <th className="px-4 py-2.5">Role</th>
                                        <th className="px-4 py-2.5">Expires At</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900 text-zinc-400">
                                      {invitations.map((inv) => (
                                        <tr key={inv.id}>
                                          <td className="px-4 py-3 font-mono text-[11px] text-zinc-300">{inv.email}</td>
                                          <td className="px-4 py-3 capitalize text-[10px]">{inv.role}</td>
                                          <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                                            {new Date(inv.expires_at).toLocaleDateString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Team Segments */}
                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyan-400" /> Workspace Teams ({teams.length})
                              </h3>

                              {teams.length === 0 ? (
                                <div className="p-4 border border-dashed border-zinc-900 rounded-xl text-center text-zinc-500 text-xs font-mono">
                                  No teams created inside this workspace.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {teams.map((t) => (
                                    <div key={t.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-white text-xs block">{t.name}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono block">Created: {new Date(t.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>

                          {/* Column 3: Forms Panel */}
                          <div className="space-y-6">
                            
                            {/* Invite user form */}
                            {(orgRole === "owner" || orgRole === "admin") && (
                              <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Invite Member</h4>
                                <form onSubmit={handleSendInvitation} className="space-y-3">
                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-1">Email address</label>
                                    <input
                                      type="email"
                                      required
                                      placeholder="member@company.com"
                                      value={inviteEmail}
                                      onChange={(e) => setInviteEmail(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-1">Role Permissions</label>
                                    <select
                                      value={inviteRole}
                                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none"
                                    >
                                      <option value="member">Member</option>
                                      <option value="admin">Administrator</option>
                                    </select>
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={isInviting}
                                    className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    {isInviting ? "Inviting..." : "Send Invitation"}
                                  </button>
                                </form>
                              </div>
                            )}

                            {/* Create team form */}
                            {(orgRole === "owner" || orgRole === "admin") && (
                              <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Create Team</h4>
                                <form onSubmit={handleCreateTeam} className="space-y-3">
                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-1">Team Name</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Backend Devs"
                                      value={newTeamName}
                                      onChange={(e) => setNewTeamName(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={isCreatingTeam}
                                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition-colors border border-zinc-800 cursor-pointer"
                                  >
                                    {isCreatingTeam ? "Creating..." : "Create Team"}
                                  </button>
                                </form>
                              </div>
                            )}

                            {/* Create another org helper */}
                            <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase font-mono">New Workspace</h4>
                              <p className="text-[11px] text-zinc-500 leading-normal">
                                Create an additional organization context to segregate different projects or organizational boundaries.
                              </p>
                              
                              <form onSubmit={handleCreateOrg} className="space-y-3 pt-1">
                                <input
                                  type="text"
                                  required
                                  placeholder="Organization Name"
                                  value={newOrgName}
                                  onChange={(e) => {
                                    setNewOrgName(e.target.value);
                                    setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                  }}
                                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-1.5 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="slug-url"
                                  value={newOrgSlug}
                                  onChange={(e) => setNewOrgSlug(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-1.5 px-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400"
                                />
                                <button
                                  type="submit"
                                  disabled={isCreatingOrg}
                                  className="w-full py-1.5 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                                >
                                  {isCreatingOrg ? "Creating..." : "Add Organization"}
                                </button>
                              </form>
                            </div>

                          </div>

                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* SUB TAB: MFA */}
              {activeSubTab === "mfa" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Multi-Factor Authentication (MFA)</h2>
                    <p className="text-zinc-500 text-xs mt-1">Configure Time-Based One-Time Password (TOTP) security factors.</p>
                  </div>

                  <div className="space-y-6">
                    {/* List active factors */}
                    <div className="space-y-3">
                      {mfaFactors.map((factor) => (
                        <div 
                          key={factor.id}
                          className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white block">TOTP Authenticator Factor</span>
                              <span className="text-[10px] text-zinc-500 font-mono block">Status: {factor.status} • ID: {factor.id}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDisableMfa(factor.id)}
                            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Disable Factor
                          </button>
                        </div>
                      ))}

                      {mfaFactors.length === 0 && !isEnrollingMfa && (
                        <div className="p-6 border border-dashed border-zinc-900 rounded-xl text-center space-y-3 bg-zinc-950/20">
                          <Lock className="w-8 h-8 text-zinc-600 mx-auto" />
                          <div>
                            <span className="text-xs font-bold text-zinc-300 block">MFA is currently Disabled</span>
                            <span className="text-[11px] text-zinc-500 mt-1 block">Shield your account credentials with a secondary verification prompt.</span>
                          </div>
                          <button
                            onClick={handleEnrollMfa}
                            className="mt-3 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <QrCode className="w-4 h-4" /> Enroll TOTP Authenticator
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QR Enrollment screen */}
                    {isEnrollingMfa && mfaQrCode && (
                      <div className="max-w-md bg-zinc-950 border border-zinc-900 p-6 rounded-xl space-y-6">
                        <div className="text-center space-y-1">
                          <h3 className="text-sm font-bold text-white">Enroll Authenticator App</h3>
                          <p className="text-zinc-500 text-xs">Scan the QR code below or enter the key manually into your authenticator app</p>
                        </div>

                        <div className="flex flex-col items-center gap-4 bg-zinc-900/50 border border-zinc-850 p-6 rounded-lg">
                          <img 
                            src={getQrSrc(mfaQrCode)} 
                            alt="MFA QR Code" 
                            className="w-44 h-44 rounded bg-white p-2 border border-zinc-700" 
                          />
                          <div className="w-full text-center space-y-1">
                            <span className="text-[10px] text-zinc-500 font-mono block uppercase">Manual Key Secret</span>
                            <span className="text-xs font-mono text-cyan-400 break-all select-all font-semibold block">{mfaSecret}</span>
                          </div>
                        </div>

                        <form onSubmit={handleVerifyMfa} className="space-y-4">
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">Verification Code</label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              placeholder="Enter 6-digit code"
                              value={mfaCodeInput}
                              onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-lg py-2.5 px-3 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => { setIsEnrollingMfa(false); setMfaQrCode(""); setMfaSecret(""); }}
                              className="py-2 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isVerifyingMfa}
                              className="py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              {isVerifyingMfa ? "Verifying..." : "Verify & Enable"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
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
