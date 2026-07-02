import { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin Panel | CogniQA Systems",
  description: "Enterprise management panel for platform statistics and diagnostics.",
  alternates: {
    canonical: "https://cogniqa.systems/admin",
  },
};

export default function Page() {
  return <AdminClient />;
}
