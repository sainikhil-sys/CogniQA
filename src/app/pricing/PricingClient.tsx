"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, HelpCircle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

export default function PricingClient() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does CogniQA access my codebase securely?",
      a: "CogniQA integrates with GitHub via OAuth2 and reads your files securely. All indexed code content is encrypted at rest using AES-256 and stored in an isolated Supabase database instance. RLS policies ensure only authorized members of your organization can access the index."
    },
    {
      q: "Can we self-host the vector engine?",
      a: "Yes. Enterprise plans support private VPC deployments on AWS, GCP, or Azure, or self-hosted Docker workloads where code embeddings never leave your internal network boundary."
    },
    {
      q: "Does the AI train on our proprietary code?",
      a: "Absolutely not. We have strict zero-data-retention APIs configured with our LLM providers. Your code snippets are sent only for real-time contextual processing and are never stored or used to train public models."
    },
    {
      q: "What happens if we exceed the AI query count on Free?",
      a: "We notify you via email when you hit 80% and 100% of your usage. Once exceeded, queries will be queued until the next billing cycle, or you can upgrade to Pro to unlock unlimited queries instantly."
    }
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      
      {/* Background elements */}
      <div className="absolute inset-0 cyber-grid opacity-20 -z-20 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10 animate-pulse-glow" />

      {/* Navbar Header */}
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
            <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/#demo" className="hover:text-white transition-colors">Interactive Demo</Link>
            <Link href="/pricing" className="text-white font-semibold">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main pricing wrapper */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        
        {/* Title */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-xs font-semibold text-cyan-400 mb-6">
            <Sparkles className="w-3 h-3" /> Transparent Developer Billing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Plans that scale with your codebase
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Free forever for personal files and open source projects. Upgrade to secure private indexing for commercial repositories.
          </p>

          {/* Monthly/Yearly toggle */}
          <div className="inline-flex items-center gap-2 bg-zinc-950 border border-zinc-900 p-1 rounded-lg mt-8">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${billingPeriod === "monthly" ? "bg-cyan-400 text-black shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${billingPeriod === "yearly" ? "bg-cyan-400 text-black shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Yearly <span className="text-[9px] bg-cyan-950/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-28">
          
          {/* Free Tier */}
          <div className="bg-zinc-950/60 border border-zinc-900 p-8 rounded-xl flex flex-col justify-between glass-panel">
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Hobbyist</span>
              <h3 className="text-xl font-bold text-white mt-2">Free</h3>
              <p className="text-zinc-500 text-xs mt-2 leading-relaxed">Essential code insights for individual developers.</p>
              
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-xs text-zinc-500">/ forever</span>
              </div>
              
              <ul className="mt-8 space-y-3.5 text-xs text-zinc-400">
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

          {/* Pro Tier */}
          <div className="bg-zinc-950/60 border-2 border-cyan-400/80 p-8 rounded-xl flex flex-col justify-between relative shadow-[0_0_30px_rgba(0,210,255,0.1)] glass-panel">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-cyan-400 text-black px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              Best for Teams
            </div>
            <div>
              <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Startup</span>
              <h3 className="text-xl font-bold text-white mt-2">Pro</h3>
              <p className="text-zinc-500 text-xs mt-2 leading-relaxed">Full contextual codebase intelligence with custom LLM indexing.</p>
              
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">
                  {billingPeriod === "monthly" ? "$29" : "$23"}
                </span>
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
              className="mt-8 w-full py-2.5 bg-cyan-400 text-black hover:bg-cyan-300 text-xs font-bold text-center block rounded-lg transition-colors shadow-[0_0_15px_rgba(0,210,255,0.3)]"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-zinc-950/60 border border-zinc-900 p-8 rounded-xl flex flex-col justify-between glass-panel">
            <div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Enterprise</span>
              <h3 className="text-xl font-bold text-white mt-2">Custom</h3>
              <p className="text-zinc-500 text-xs mt-2 leading-relaxed">Self-hosted, VPC, or secure cloud environments with custom compliance.</p>
              
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">Contact Us</span>
              </div>
              
              <ul className="mt-8 space-y-3.5 text-xs text-zinc-400">
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Self-hosted docker / VPC deployments</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Dedicated GPUs / Custom fine-tuned models</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> SOC2 Compliance & HIPAA mapping</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> 24/7 dedicated solutions engineering</li>
                <li className="flex gap-2.5 items-center"><Check className="w-3.5 h-3.5 text-cyan-400" /> Custom SSO / SAML and Okta directory sync</li>
              </ul>
            </div>
            <a 
              href="mailto:sales@cogniqa.codes"
              className="mt-8 w-full py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-white text-xs font-semibold text-center block transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>

        {/* FAQs */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-5 cursor-pointer hover:border-zinc-800 transition-colors"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" /> {faq.q}
                  </h4>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-zinc-400 mt-3 pl-6 leading-relaxed border-l border-zinc-900">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

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

          <div className="text-xs text-zinc-500 font-mono">
            &copy; 2026 CogniQA Inc. All rights reserved. Understand Code. Predict Impact. Ship Smarter.
          </div>

          <div className="flex gap-6 text-xs text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">Home</Link>
            <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
            <a href="#" className="hover:text-zinc-300">Privacy Policy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
