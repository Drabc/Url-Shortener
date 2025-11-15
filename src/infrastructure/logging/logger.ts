/* eslint-disable @stylistic/indent */
import { Logger, LoggerOptions, pino } from 'pino'

import { config } from '@infrastructure/config/config.js'

const options: LoggerOptions = {
  level: config.isNonProd ? 'debug' : 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
}

const transport = config.isNonProd
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: true,
        ignore: 'pid,hostname',
      },
      sync: true,
    }
  : undefined

export const logger: Logger = pino(transport ? { ...options, transport } : options)
