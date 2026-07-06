import { Metadata } from "next";
import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Accept Invitation | CogniQA Systems",
  description: "Join your team workspace on CogniQA Systems.",
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    }>
      <AcceptInviteClient />
    </Suspense>
  );
}
