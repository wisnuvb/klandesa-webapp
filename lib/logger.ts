import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Log level: trace | debug | info | warn | error | fatal
 * - Production default: info (urangi noise, cukup untuk monitoring)
 * - Development default: debug (lebih detail untuk development)
 * - Override via LOG_LEVEL di .env
 */
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug')

export const logger = pino(
  {
    level: logLevel,
    transport: !isProduction
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  }
)
