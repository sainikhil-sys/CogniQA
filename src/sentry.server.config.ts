import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://d4d3a09c56b35cb10fcab4a0b96ed8c0@o4511663978381312.ingest.us.sentry.io/4511663980544005",
  tracesSampleRate: 1.0,
});
