import { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login | CogniQA",
  description: "Secure login to CogniQA platform.",
  alternates: {
    canonical: "https://cogniqa.codes/login",
  },
  openGraph: {
    title: "Login | CogniQA",
    description: "Secure login to CogniQA platform.",
    url: "https://cogniqa.codes/login",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Login | CogniQA",
    description: "Secure login to CogniQA platform.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function Page() {
  return <LoginClient />;
}
