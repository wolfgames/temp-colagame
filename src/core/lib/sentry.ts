import { Environment } from "@wolfgames/game-kit";

const SENTRY_DSN = "https://2dca8e7bdb35416abee59ca40bb0f887@o4509084313976832.ingest.us.sentry.io/4510839538384896";

type SentryModule = typeof import("@sentry/browser");

interface SentryConfig {
  enabled: boolean;
  dsn: string;
  environment: Environment;
}

export interface SentryUserContext {
  userId: string;
  email?: string;
  sessionId: string;
}

type ErrorTracker = (params: {
  error_type: string;
  user_id: string;
  session_id: string;
}) => void;

let Sentry: SentryModule | null = null;
let errorTracker: ErrorTracker | null = null;
let userId: string | null = null;
let sessionId: string | null = null;

function getSentryConfig(environment: Environment): SentryConfig {
  const dsn =
    import.meta.env.VITE_SENTRY_DSN || SENTRY_DSN;

  const enabledEnvironments: Environment[] = [Environment.QA, Environment.Staging, Environment.Production];
  const enabled = enabledEnvironments.includes(environment);

  return {
    enabled: enabled && Boolean(dsn),
    dsn,
    environment,
  };
}

export async function initSentry(environment: Environment): Promise<boolean> {
  const config = getSentryConfig(environment);

  if (!config.enabled || !config.dsn) {
    console.log(
      `[Sentry] Skipped -- environment: ${environment}, enabled: ${config.enabled}`,
    );
    return false;
  }

  try {
    Sentry = await import("@sentry/browser");

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],

      beforeSend(event, hint) {
        if (errorTracker && userId && sessionId) {
          try {
            const hasException = !!event.exception?.values?.length;
            if (!hasException) return event;

            const errorType = event.exception!.values![0]!.type ?? "Error";
            errorTracker({
              error_type: errorType,
              user_id: userId,
              session_id: sessionId,
            });
            console.log(
              `[Sentry] Auto-tracked error in PostHog: ${errorType}`,
            );
          } catch (trackingError) {
            console.warn("[Sentry] PostHog tracking failed:", trackingError);
          }
        }

        return event;
      },

      sendDefaultPii: false,
    });

    console.log(`[Sentry] Initialized - env: ${environment}`);
    return true;
  } catch (error) {
    console.error("[Sentry] Init failed:", error);
    return false;
  }
}

export function isSentryEnabled(): boolean {
  return Sentry?.getClient() !== undefined;
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  if (!Sentry || !isSentryEnabled()) {
    console.warn("[Sentry not initialized]", error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional_info", context);
    }
    const eventId = Sentry!.captureException(error);
    console.log(`[Sentry] Exception sent. Event ID: ${eventId}`);
  });
}

export function setUser(id: string) {
  if (!Sentry || !isSentryEnabled()) return;
  Sentry.setUser({ id });
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  if (!Sentry || !isSentryEnabled()) return;
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  });
}

/**
 * Connect PostHog tracker to Sentry
 *
 * Called from AnalyticsContext after PostHog is initialized.
 */
export function connectSentryToPostHog(
  tracker: ErrorTracker,
  userContext: SentryUserContext,
): void {
  if (!Sentry || !isSentryEnabled()) return;
  errorTracker = tracker;
  userId = userContext.userId;
  sessionId = userContext.sessionId;

  Sentry.setUser({
    id: userContext.userId,
    email: userContext.email || undefined,
  });

  Sentry.setContext("session", {
    session_id: userContext.sessionId,
  });

  console.log(
    `[Sentry] Connected to PostHog - automatic tracking enabled for userId: ${userContext.userId}`,
  );
}

export { Sentry };
