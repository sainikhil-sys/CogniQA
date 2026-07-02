import { Metadata } from "next";
import AgentClient from "./AgentClient";

export const metadata: Metadata = {
  title: "AI Agent Console | CogniQA Systems",
  description: "Autonomous software development workspace with natural language prompts.",
  alternates: {
    canonical: "https://cogniqa.systems/agent",
  },
};

export default function Page() {
  return <AgentClient />;
}
