import { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "CogniQA | Understand Code. Predict Impact. Ship Smarter.",
  description: "Analyze repositories, visualize architecture, detect technical debt, and interact with codebases using AI.",
  keywords: [
    "AI code intelligence", 
    "code analysis", 
    "repository analysis", 
    "AI developer tools", 
    "technical debt detection", 
    "architecture visualization"
  ],
  alternates: {
    canonical: "https://cogniqa.codes",
  },
  openGraph: {
    title: "CogniQA | Understand Code. Predict Impact. Ship Smarter.",
    description: "Analyze repositories, visualize architecture, detect technical debt, and interact with codebases using AI.",
    url: "https://cogniqa.codes",
    siteName: "CogniQA",
    type: "website",
    images: [
      {
        url: "https://cogniqa.codes/images/og-home.jpg",
        width: 1200,
        height: 630,
        alt: "CogniQA platform",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CogniQA | Understand Code. Predict Impact. Ship Smarter.",
    description: "Analyze repositories, visualize architecture, detect technical debt, and interact with codebases using AI.",
    images: ["https://cogniqa.codes/images/og-home.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function Page() {
  return <LandingClient />;
}
