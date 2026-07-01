"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  Layers, 
  GitBranch, 
  Search, 
  Sparkles, 
  TrendingDown, 
  ArrowRight, 
  Play, 
  Check, 
  Shield, 
  Cpu, 
  Code, 
  GitFork, 
  MessageSquare, 
  Bot, 
  Zap, 
  LineChart, 
  HelpCircle,
  FolderTree,
  AlertTriangle,
  Flame,
  FileCode2
} from "lucide-react";

export default function LandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState<"dependency" | "debt" | "qa" | "rootcause">("dependency");
  const [qaInput, setQaInput] = useState("How does the database authentication middleware work?");
  const [qaResponse, setQaResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // QA Tab interactivity
  const handleQaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || isTyping) return;
    
    setIsTyping(true);
    setQaResponse("");
    
    const responses: Record<string, string> = {
      "middleware": "The database authentication middleware is implemented in `src/middleware/auth.py`. It intercepts HTTP requests, extracts the JWT token from the `Authorization` header, decrypts it using the secret key (retrieved from Vault/Env), and verifies the signature. If valid, it attaches the `User` context to `request.state.user`. If invalid or expired, it aborts the request with a `401 Unauthorized` response. Access to PostgreSQL is handled via a connection pool initialized in `src/db/session.py`.",
      "database": "The database authentication middleware is implemented in `src/middleware/auth.py`. It intercepts HTTP requests, extracts the JWT token from the `Authorization` header, decrypts it using the secret key (retrieved from Vault/Env), and verifies the signature. If valid, it attaches the `User` context to `request.state.user`. If invalid or expired, it aborts the request with a `401 Unauthorized` response. Access to PostgreSQL is handled via a connection pool initialized in `src/db/session.py`.",
      "default": "Based on my index of your repository, that logic is located in `/src/core/auth.ts` and managed by the `AuthProvider` component. It implements standard OAuth2 flow, linking to your Supabase/PostgreSQL schema definitions in `schema.prisma`. Let me know if you would like me to output the specific line-by-line diff!"
    };

    const textToType = qaInput.toLowerCase().includes("auth") || qaInput.toLowerCase().includes("middleware") 
      ? responses.middleware 
      : responses.default;
      
    let index = 0;
    const interval = setInterval(() => {
      if (index < textToType.length) {
        setQaResponse((prev) => prev + textToType.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
  };

  useEffect(() => {
    // Initial simulated QA typing
    setIsTyping(true);
    const initialText = "The authentication flow utilizes next-auth under the hood, integrated with Supabase/PostgreSQL. Token state is saved in httpOnly cookies, and the middleware interceptor guards all routes matching `/dashboard/*` or `/api/secure/*`. PostgreSQL schemas are indexed via Prisma DB client pools.";
    let index = 0;
    const interval = setInterval(() => {
      if (index < initialText.length) {
        setQaResponse((prev) => prev + initialText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      
      {/* Background decoration */}
      <div className="absolute inset-0 cyber-grid opacity-30 animate-grid-move -z-20" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10 animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] -z-10 animate-pulse" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              C
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              Cogni<span className="text-cyan-400">QA</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a>
            <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-xs font-semibold text-cyan-400 mb-8 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
          <Sparkles className="w-3.5 h-3.5" /> Introducing Next-Gen AI Code Intelligence
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Understand Code <br />
          <span className="bg-gradient-to-r from-white via-zinc-200 to-cyan-400 bg-clip-text text-transparent">
            Like Never Before
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed mb-10">
          CogniQA parses your repositories, maps architecture, flags structural debt, and answers complex system questions using deep AI context.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-16">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
          >
            Start Free Now <ArrowRight className="w-5 h-5" />
          </Link>
          <a 
            href="#demo"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" /> Book Demo
          </a>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-12 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Experience CogniQA Live
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Interact with our simulated intelligence engine. Switch views to explore our architectural capabilities.
          </p>
        </div>

        {/* Demo Console */}
        <div className="glass-panel-accent rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-zinc-800 max-w-5xl mx-auto">
          {/* Console Top Bar */}
          <div className="bg-zinc-950/80 border-b border-zinc-850 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs text-zinc-500 font-mono ml-4">repo-analyzer: cogniqa/core-engine</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/40 border border-green-900/50 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Indexed (2,450 files)
              </div>
            </div>
          </div>

          {/* Console Tab Selectors */}
          <div className="flex border-b border-zinc-900 bg-zinc-950/40">
            <button
              onClick={() => setActiveDemoTab("dependency")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeDemoTab === "dependency" 
                  ? "text-cyan-400 bg-zinc-900 border-b-2 border-cyan-400" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4" /> Dependency Graph
            </button>
            <button
              onClick={() => setActiveDemoTab("debt")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeDemoTab === "debt" 
                  ? "text-cyan-400 bg-zinc-900 border-b-2 border-cyan-400" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingDown className="w-4 h-4" /> Technical Debt
            </button>
            <button
              onClick={() => setActiveDemoTab("qa")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeDemoTab === "qa" 
                  ? "text-cyan-400 bg-zinc-900 border-b-2 border-cyan-400" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bot className="w-4 h-4" /> AI Code Agent
            </button>
            <button
              onClick={() => setActiveDemoTab("rootcause")}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeDemoTab === "rootcause" 
                  ? "text-cyan-400 bg-zinc-900 border-b-2 border-cyan-400" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-4 h-4" /> Root Cause Analysis
            </button>
          </div>

          {/* Console Working Panel */}
          <div className="bg-[#0b0b0d] min-h-[350px] p-6 text-sm font-mono">
            {activeDemoTab === "dependency" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                  <span>Interactive Dependency Hierarchy</span>
                  <span>Visual Graph Flow</span>
                </div>
                
                {/* Visual Flow diagram representation */}
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="px-4 py-2 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 rounded-md shadow-[0_0_15px_rgba(6,182,212,0.1)] flex items-center gap-2">
                    <Code className="w-4 h-4" /> Frontend (Next.js Client Components)
                  </div>
                  
                  <div className="w-0.5 h-6 bg-zinc-700" />
                  
                  <div className="px-4 py-2 bg-blue-950/30 border border-blue-500/30 text-blue-400 rounded-md shadow-[0_0_15px_rgba(59,130,246,0.1)] flex items-center gap-2">
                    <Zap className="w-4 h-4" /> API Gateway / Middleware Server
                  </div>
                  
                  <div className="w-0.5 h-6 bg-zinc-700" />
                  
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-md flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> UserService
                    </div>
                    <div className="px-4 py-2 bg-purple-950/30 border border-purple-500/30 text-purple-400 rounded-md flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> AnalysisEngine
                    </div>
                  </div>
                  
                  <div className="flex justify-between w-48">
                    <div className="w-0.5 h-6 bg-zinc-700 mx-auto" />
                    <div className="w-0.5 h-6 bg-zinc-700 mx-auto" />
                  </div>
                  
                  <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md flex items-center gap-2">
                    <GitFork className="w-4 h-4" /> PostgreSQL (pgvector Storage)
                  </div>
                </div>

                <div className="text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                  <span className="text-cyan-400 font-semibold">Architectural Insight:</span> Loose coupling between <span className="text-emerald-400">UserService</span> and <span className="text-purple-400">AnalysisEngine</span> allows micro-service isolation. Next.js communicates with API gateway asynchronously using WebSockets.
                </div>
              </div>
            )}

            {activeDemoTab === "debt" && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                  <span>Complexity & Refactoring Dashboard</span>
                  <span>Overall Code Health: <span className="text-emerald-400">B+</span></span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-lg">
                    <span className="text-xs text-zinc-500 block">Cyclomatic Complexity</span>
                    <span className="text-2xl font-bold text-yellow-400 mt-1 block">42.4 (High)</span>
                    <span className="text-[10px] text-zinc-400 mt-2 block">Critical: `src/parser/resolver.py`</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-lg">
                    <span className="text-xs text-zinc-500 block">Duplicate Code Block</span>
                    <span className="text-2xl font-bold text-red-400 mt-1 block">14.2%</span>
                    <span className="text-[10px] text-zinc-400 mt-2 block">Redundant parsing logic in AST utils</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-lg">
                    <span className="text-xs text-zinc-500 block">Dead Functions Detected</span>
                    <span className="text-2xl font-bold text-green-400 mt-1 block">18 Functions</span>
                    <span className="text-[10px] text-zinc-400 mt-2 block">Safe to delete (0 calls indexed)</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 bg-yellow-950/20 p-3 rounded-lg border border-yellow-900/30 flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-yellow-400 font-semibold">Priority Alert:</span> File `src/parser/resolver.py` (line 120-250) has cognitive depth exceeding 8. We recommend breaking the function `resolve_nested_imports` down into 3 smaller modules to prevent stack traces on circular references.
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === "qa" && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                  <span>AI Assistant Context Window</span>
                  <span>Token Context Size: 1.2M Tokens (Pruned AST)</span>
                </div>

                <div className="bg-zinc-950 rounded-lg border border-zinc-900 p-4 space-y-4 min-h-[180px]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">U</div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-xs max-w-[80%] text-zinc-200">
                      {qaInput}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-xs font-bold text-cyan-400">
                      AI
                    </div>
                    <div className="bg-cyan-950/10 border border-cyan-950/50 p-2.5 rounded-lg text-xs text-zinc-300 max-w-[85%] leading-relaxed">
                      {qaResponse}
                      {isTyping && <span className="w-1.5 h-3 bg-cyan-400 inline-block animate-pulse ml-0.5" />}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleQaSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={qaInput}
                    onChange={(e) => setQaInput(e.target.value)}
                    placeholder="Ask repository intelligence..."
                    className="flex-1 px-3 py-2 text-xs bg-zinc-950 border border-zinc-900 rounded-md focus:border-cyan-400 focus:outline-none text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-md transition-colors disabled:opacity-50"
                  >
                    Send Query
                  </button>
                </form>
              </div>
            )}

            {activeDemoTab === "rootcause" && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                  <span>Stack Trace & Log Diagnostic Interface</span>
                  <span>Ready to parse</span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-xs font-mono text-red-400">
                  <div>[ERROR] 2026-06-29 00:21:40 Exception in thread &quot;main&quot; java.lang.NullPointerException</div>
                  <div className="text-zinc-500">&nbsp;&nbsp;at com.cogniqa.engine.parser.ASTParser.visitNode(ASTParser.java:42)</div>
                  <div className="text-zinc-500">&nbsp;&nbsp;at com.cogniqa.engine.parser.ASTParser.parse(ASTParser.java:18)</div>
                  <div className="text-zinc-500">&nbsp;&nbsp;at com.cogniqa.engine.core.Main.main(Main.java:112)</div>
                </div>

                <div className="bg-cyan-950/20 border border-cyan-950/50 p-4 rounded-lg">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs mb-2">
                    <Bot className="w-4 h-4" /> Root Cause Diagnosis:
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    The crash occurs at line 42 of <span className="text-cyan-400">ASTParser.java</span>. The parser is visiting a code block without verifying if the token payload is initialized. This occurs during index parsing of ES6 export exports containing empty default objects.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-900/30">Null Reference</span>
                    <span className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">ASTParser.java:42</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto border-t border-zinc-950">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Engineered for Deep Context
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Everything developer teams need to maintain architectural consistency and streamline complex refactoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dependency Graph</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Visualize links between your frontend components, service routes, controllers, database models, and external APIs dynamically.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Technical Debt Score</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Automated audit of cyclomatic complexity, circular imports, dead code paths, and duplicated functions, scored and mapped daily.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Chat Assistant</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ask database middleware details, trace payment flows, identify authorization gates, or request refactoring templates instantly.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <GitBranch className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Seamless Repositories</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Connect to GitHub in 1 click, import GitLab, or upload `.zip` source bundles. Your codebase starts indexing immediately in background nodes.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Root Cause Diagnostics</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Paste standard backend stack traces or production log logs. The AI matches variables against repository syntax to pinpoint code error lines.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-xl hover:border-cyan-500/20 hover:bg-zinc-900/50 transition-all group">
            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mb-6 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.15)] group-hover:border-cyan-500/30 transition-all">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Code Intelligence Engine</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Parses file structures, scans module imports, identifies exposed REST/GraphQL APIs, database usage, and generates system architecture context.
            </p>
          </div>
        </div>
      </section>

      {/* Metrics / Benefits Section */}
      <section id="benefits" className="py-20 px-6 max-w-7xl mx-auto border-t border-zinc-950">
        <div className="bg-gradient-to-r from-zinc-950 via-[#0a0a0d] to-zinc-950 border border-zinc-900 rounded-2xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <span className="text-cyan-400 text-sm font-semibold tracking-wider uppercase">Engineered for efficiency</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-6">
              Empower Developers, Unblock Engineering Leaders
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Codebases grow. Documentation rots. Developer turnover impacts schedules. CogniQA provides unified, real-time code visibility that stays updated on every single commit.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                <span className="text-sm text-zinc-300">Reduce onboarding overhead to hours instead of weeks</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                <span className="text-sm text-zinc-300">Prevent architecture divergence and code duplication</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                <span className="text-sm text-zinc-300">Debug staging environments 10x faster with log mappings</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto shrink-0">
            <div className="bg-zinc-900/50 border border-zinc-900 p-6 rounded-xl text-center w-full md:w-44">
              <span className="text-3xl font-extrabold text-white block">80%</span>
              <span className="text-xs text-zinc-400 mt-2 block">Faster Onboarding</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-900 p-6 rounded-xl text-center w-full md:w-44">
              <span className="text-3xl font-extrabold text-cyan-400 block">45%</span>
              <span className="text-xs text-zinc-400 mt-2 block">Debt Mitigation</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-900 p-6 rounded-xl text-center w-full md:w-44">
              <span className="text-3xl font-extrabold text-cyan-400 block">10x</span>
              <span className="text-xs text-zinc-400 mt-2 block">Code Search Speed</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-900 p-6 rounded-xl text-center w-full md:w-44">
              <span className="text-3xl font-extrabold text-white block">60%</span>
              <span className="text-xs text-zinc-400 mt-2 block">Fewer Tech debt bugs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto border-t border-zinc-950">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Predictable Developer-First Pricing
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Free forever for open-source and individual developers. Scale dynamically as your codebase grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-bold tracking-wider uppercase">For Hobbyists</span>
              <h3 className="text-xl font-bold text-white mt-2">Free</h3>
              <p className="text-zinc-400 text-sm mt-3">Essential code insights for individual developers.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-xs text-zinc-500">/ forever</span>
              </div>
              <ul className="mt-8 space-y-3.5 text-xs text-zinc-300">
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> 1 Public Repo</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Static AST Code Parsing</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> 100 AI Queries per month</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Dependency visualization</li>
              </ul>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-white text-xs font-semibold text-center block transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Tier (Highlighted) */}
          <div className="bg-zinc-950 border-2 border-cyan-400/80 p-8 rounded-xl flex flex-col justify-between relative shadow-[0_0_30px_rgba(0,210,255,0.1)]">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-cyan-400 text-black px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              Most Popular
            </div>
            <div>
              <span className="text-xs text-cyan-400 font-bold tracking-wider uppercase">For High Growth Teams</span>
              <h3 className="text-xl font-bold text-white mt-2">Pro</h3>
              <p className="text-zinc-400 text-sm mt-3">Full contextual codebase intelligence with custom LLM indexing.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">$29</span>
                <span className="text-xs text-zinc-500">/ user / mo</span>
              </div>
              <ul className="mt-8 space-y-3.5 text-xs text-zinc-300">
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Unlimited Public & Private Repos</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Advanced AST & Vector Indexing</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Unlimited AI Queries</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Cyclomatic Tech Debt Charts</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Root Cause Log Diagnostics</li>
              </ul>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-2.5 rounded-lg bg-cyan-400 text-black text-xs font-bold text-center block hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(0,210,255,0.3)]"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-xl flex flex-col justify-between">
            <div>
              <span className="text-xs text-zinc-500 font-bold tracking-wider uppercase">For Enterprise</span>
              <h3 className="text-xl font-bold text-white mt-2">Custom</h3>
              <p className="text-zinc-400 text-sm mt-3">Self-hosted, VPC, or secure cloud environments with custom compliance.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">Contact Us</span>
              </div>
              <ul className="mt-8 space-y-3.5 text-xs text-zinc-300">
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Self-hosted docker / VPC deployments</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Dedicated GPUs / Custom fine-tuned models</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> SOC2 Compliance & HIPAA mapping</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> 24/7 dedicated solutions engineering</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Custom SSO / SAML and Okta directory sync</li>
              </ul>
            </div>
            <a 
              href="mailto:sales@cogniqa.com"
              className="mt-8 w-full py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-white text-xs font-semibold text-center block transition-colors"
            >
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-xs">
              C
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Cogni<span className="text-cyan-400">QA</span>
            </span>
          </div>

          <div className="text-xs text-zinc-500">
            &copy; 2026 CogniQA Inc. All rights reserved. Understand Code. Predict Impact. Ship Smarter.
          </div>

          <div className="flex gap-6 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-300">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-300">Terms of Service</a>
            <a href="#" className="hover:text-zinc-300">Security / Vault</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
