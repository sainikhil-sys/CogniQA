import { Metadata } from "next";
import AnalysisClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "Repository Analysis | CogniQA",
  description: "Analyze architecture, dependencies, technical debt, and repository insights.",
  alternates: {
    canonical: "https://cogniqa.codes/analysis",
  },
  openGraph: {
    title: "Repository Analysis | CogniQA",
    description: "Analyze architecture, dependencies, technical debt, and repository insights.",
    url: "https://cogniqa.codes/analysis",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Repository Analysis | CogniQA",
    description: "Analyze architecture, dependencies, technical debt, and repository insights.",
  },
  robots: {
    index: false,
    follow: false,
  }
};

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <div className="animate-spin text-cyan-400 text-lg mb-2">⏳</div>
        <p className="text-xs text-zinc-500">Initializing workspace...</p>
      </div>
    }>
      <AnalysisClient />
    </Suspense>
  );
}
