/* eslint-disable @stylistic/indent */
import { Logger, LoggerOptions, pino } from 'pino'

import { config } from '@infrastructure/config/config.js'

const options: LoggerOptions = {
  level: config.isDev ? 'debug' : 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
}

const transport = config.isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: true,
        ignore: 'pid,hostname',
      },
    }
  : undefined

export const logger: Logger = pino(
  transport ? { ...options, transport } : options,
)
