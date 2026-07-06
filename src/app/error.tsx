"use client";

import React, { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="max-w-md w-full text-center space-y-6 bg-zinc-950 border border-zinc-900 rounded-xl p-8 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-900/50 flex items-center justify-center mx-auto text-red-500 text-2xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-white">An Error Occurred</h1>
          <p className="text-zinc-500 text-xs leading-normal">
            A route-level error has been intercepted and logged.
          </p>
        </div>
        <div className="p-3.5 bg-zinc-900/35 border border-zinc-850 rounded-lg text-left">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">Diagnostic Report</span>
          <code className="text-[10px] text-red-400 font-mono break-all line-clamp-3">
            {error.message || error.toString()}
          </code>
        </div>
        <button
          onClick={() => reset()}
          className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          Retry Route Loading
        </button>
      </div>
    </div>
  );
}
