import { Metadata } from "next";
import { Suspense } from "react";
import AgentClient from "./AgentClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Agent Console | CogniQA Systems",
  description: "Autonomous software development workspace with natural language prompts.",
  alternates: {
    canonical: "https://cogniqa.systems/agent",
  },
};

export default function Page() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <AgentClient />
    </Suspense>
  );
}
