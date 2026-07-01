import { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Signup | CogniQA",
  description: "Create your CogniQA account.",
  alternates: {
    canonical: "https://cogniqa.codes/signup",
  },
  openGraph: {
    title: "Signup | CogniQA",
    description: "Create your CogniQA account.",
    url: "https://cogniqa.codes/signup",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Signup | CogniQA",
    description: "Create your CogniQA account.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function Page() {
  return <SignupClient />;
}
