import { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | CogniQA Systems",
  description: "Configure profile, integrations, and developer API keys.",
  alternates: {
    canonical: "https://cogniqa.systems/settings",
  },
};

export default function Page() {
  return <SettingsClient />;
}
