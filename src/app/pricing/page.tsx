import { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing | CogniQA",
  description: "Explore pricing plans for CogniQA AI code intelligence platform.",
  alternates: {
    canonical: "https://cogniqa.codes/pricing",
  },
  openGraph: {
    title: "Pricing | CogniQA",
    description: "Explore pricing plans for CogniQA AI code intelligence platform.",
    url: "https://cogniqa.codes/pricing",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pricing | CogniQA",
    description: "Explore pricing plans for CogniQA AI code intelligence platform.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function Page() {
  return <PricingClient />;
}
