import * as Sentry from "@sentry/nextjs";

export function initClient() {
  if (typeof window !== "undefined") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://d4d3a09c56b35cb10fcab4a0b96ed8c0@o4511663978381312.ingest.us.sentry.io/4511663980544005",
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.replayIntegration(),
      ],
    });
  }
}
