"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Check, 
  ArrowLeft, 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  History, 
  Award,
  Database
} from "lucide-react";

interface Invoice {
  id: string;
  plan: string;
  amount: number;
  payment_id: string;
  status: string;
  created_at: string;
}

export default function BillingClient() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  
  const [currentPlan, setCurrentPlan] = useState("Starter");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [email, setEmail] = useState("");
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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

  const loadBillingData = async () => {
    try {
      const sessionRes = await supabase.auth.getSession();
      const userMail = sessionRes.data.session?.user?.email || "developer@cogniqa.codes";
      setEmail(userMail);

      const res = await fetchWithAuth(`${apiBaseUrl}/billing`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan);
        setSubscriptionStatus(data.subscription_status);
        setInvoices(data.invoices);
      }
    } catch (err) {
      setErrorMessage("Could not load subscription details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    loadBillingData();
  }, [isMounted]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (plan: string, priceINR: number) => {
    setIsCheckoutLoading(plan);
    setErrorMessage("");
    setSuccessMessage("");

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      setErrorMessage("Razorpay payment gateway failed to initialize. Check internet connection.");
      setIsCheckoutLoading(null);
      return;
    }

    try {
      // 1. Create order on FastAPI backend
      const res = await fetchWithAuth(`${apiBaseUrl}/billing/checkout`, {
        method: "POST",
        body: JSON.stringify({
          plan: plan,
          amount: priceINR * 100 // convert to paise
        })
      });

      if (!res.ok) {
        throw new Error("API checkout order initiation failed.");
      }

      const orderData = await res.json();

      // 2. Open Razorpay payment gateway options window
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: "INR",
        name: "CogniQA Systems",
        description: `Upgrade to ${plan} Tier Plan`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          setIsCheckoutLoading(plan);
          try {
            // Verify payment on backend
            const verifyRes = await fetchWithAuth(`${apiBaseUrl}/billing/verify`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "",
                plan: plan,
                amount: orderData.amount
              })
            });

            if (verifyRes.ok) {
              setSuccessMessage(`Plan upgraded to ${plan} successfully!`);
              loadBillingData();
            } else {
              const err = await verifyRes.json();
              setErrorMessage(err.detail || "Payment verification failed.");
            }
          } catch (err) {
            setErrorMessage("Handshake timeout during verification.");
          } finally {
            setIsCheckoutLoading(null);
          }
        },
        prefill: {
          email: email
        },
        theme: {
          color: "#00d2ff"
        },
        modal: {
          ondismiss: function () {
            setIsCheckoutLoading(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start checkout. Check API logs.");
      setIsCheckoutLoading(null);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const plans = [
    {
      name: "Starter",
      price: "$0",
      priceINR: 0,
      period: "forever",
      description: "Basic codebase analysis framework.",
      features: [
        "Connect up to 2 repositories",
        "Deterministic cyclomatic complexity calculations",
        "Circular dependency mapping diagnostics",
        "RAG local code context indexing",
        "Standard security threat analysis"
      ]
    },
    {
      name: "Pro",
      price: "$49",
      priceINR: 3999,
      period: "per month",
      description: "Complete AI Engineering toolset for growing startups.",
      features: [
        "Connect up to 15 repositories",
        "Unlimited vector embeddings chunks",
        "RAG reasoning context searches",
        "Full AI Assistant chatbot integration",
        "Access to basic AI Engineering Agent workflows",
        "Export reports as CSV / PDF data sheets"
      ]
    },
    {
      name: "Enterprise",
      price: "$299",
      priceINR: 24999,
      period: "per month",
      description: "Scale secure intelligence across enterprise groups.",
      features: [
        "Unlimited repository integrations",
        "Enterprise-grade branch generation",
        "Automated lints & compiler check logs",
        "Complete AI Engineering Console dashboard",
        "Custom deployment hooks (Railway, Vercel)",
        "Priority dedicated SLA support channels"
      ]
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans">
      
      {/* Grid */}
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
            <span className="text-xs text-zinc-500 font-mono">Billing Center</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-cyan-400" /> Active Tier: <span className="font-bold text-white uppercase">{currentPlan}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-10 space-y-12">
        
        {/* Messages */}
        {errorMessage && (
          <div className="p-4 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-900/30 rounded-xl text-xs text-emerald-400 font-mono">
            {successMessage}
          </div>
        )}

        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Choose Your Intelligence Tier
          </h1>
          <p className="text-zinc-500 text-sm">
            Scale up codebase insights, automated engineering tasks, and security tracking features as your organization grows.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map(plan => {
              const isActive = currentPlan.toLowerCase() === plan.name.toLowerCase();
              return (
                <div 
                  key={plan.name}
                  className={`bg-zinc-950/60 border rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all ${isActive ? "border-cyan-400 shadow-[0_0_30px_rgba(0,210,255,0.08)] bg-zinc-950/80" : "border-zinc-900 hover:border-zinc-800"}`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 bg-cyan-400 text-black text-[9px] font-bold px-3 py-1 uppercase rounded-bl-lg font-mono">
                      Current Active Plan
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.name} Plan</h3>
                      <p className="text-zinc-500 text-xs mt-1 min-h-[32px]">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                      <span className="text-zinc-500 text-xs">{plan.period}</span>
                    </div>

                    <ul className="space-y-3 text-xs text-zinc-400">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8 mt-6 border-t border-zinc-900/60">
                    {isActive ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold rounded-lg cursor-not-allowed uppercase font-mono"
                      >
                        Plan Active
                      </button>
                    ) : plan.priceINR === 0 ? (
                      <button
                        onClick={() => router.replace("/dashboard")}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer uppercase font-mono"
                      >
                        Use Starter Free
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(plan.name, plan.priceINR)}
                        disabled={isCheckoutLoading !== null}
                        className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,210,255,0.15)] disabled:opacity-50 uppercase font-mono"
                      >
                        {isCheckoutLoading === plan.name ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading Checkout...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Subscribe Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice logs */}
        {!isLoading && invoices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" /> Subscription Invoice Logs
            </h2>

            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/20">
              <table className="w-full border-collapse text-left text-xs text-zinc-400">
                <thead className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3">Invoice UUID</th>
                    <th className="px-4 py-3">Subscribed Plan</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Razorpay Transaction ID</th>
                    <th className="px-4 py-3">Billing Status</th>
                    <th className="px-4 py-3">Date Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-zinc-900/10">
                      <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{inv.id}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-350">{inv.plan}</td>
                      <td className="px-4 py-3 font-semibold text-white">INR {inv.amount}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">{inv.payment_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-900/40 text-[10px] text-emerald-400 font-mono capitalize">
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono">{new Date(inv.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
