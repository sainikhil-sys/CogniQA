import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    service: 'cogniqa-systems',
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname,env,service',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});

// A helper to create child loggers with context (e.g., request ID)
export function getLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
