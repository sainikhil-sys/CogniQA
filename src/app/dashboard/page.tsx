import { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | CogniQA",
  description: "Manage repositories and AI-powered code intelligence reports.",
  alternates: {
    canonical: "https://cogniqa.codes/dashboard",
  },
  openGraph: {
    title: "Dashboard | CogniQA",
    description: "Manage repositories and AI-powered code intelligence reports.",
    url: "https://cogniqa.codes/dashboard",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dashboard | CogniQA",
    description: "Manage repositories and AI-powered code intelligence reports.",
  },
  robots: {
    index: false,
    follow: false,
  }
};

export default function Page() {
  return <DashboardClient />;
}
