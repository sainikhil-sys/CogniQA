import { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password | CogniQA Systems",
  description: "Securely update your account credentials.",
};

export default function Page() {
  return <ResetPasswordClient />;
}
