import { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Intelligence Reports | CogniQA Systems",
  description: "Download codebase architecture and security reports.",
  alternates: {
    canonical: "https://cogniqa.systems/reports",
  },
};

export default function Page() {
  return <ReportsClient />;
}
