// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: "https://b58873ad33badf5bd020302d556aaa13@o4511220617052160.ingest.us.sentry.io/4511220734230529",

  integrations: [Sentry.replayIntegration()],

  // Sample 10% of traces in production to keep ingest manageable; full capture
  // in development where the volume is low.
  tracesSampleRate: isProd ? 0.1 : 1,

  // Logs add ingest cost and aren't actionable in prod — Sentry events already
  // capture stack + breadcrumbs.
  enableLogs: !isProd,

  // Session replay sampled lightly in prod; on-error capture stays at 100%.
  replaysSessionSampleRate: isProd ? 0.05 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
