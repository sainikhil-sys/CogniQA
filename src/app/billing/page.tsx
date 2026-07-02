import { Metadata } from "next";
import BillingClient from "./BillingClient";

export const metadata: Metadata = {
  title: "Billing & Subscriptions | CogniQA Systems",
  description: "Manage plans, invoices, and payment configurations.",
  alternates: {
    canonical: "https://cogniqa.systems/billing",
  },
};

export default function Page() {
  return <BillingClient />;
}
