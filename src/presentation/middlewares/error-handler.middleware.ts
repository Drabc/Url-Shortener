import { NextFunction, Request, Response } from 'express'

import { logger } from '@infrastructure/logging/logger.js'
import { config } from '@infrastructure/config/config.js'
import { BaseError, ErrorKinds } from '@shared/errors.js'
import { toBaseError } from '@shared/normalize-error.js'

/**
 * Middleware for handling errors in the application.
 * It normalizes errors and sends a structured response to the client.
 * @param {Error} err - The error object thrown by the application.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 * @returns {void}
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // If headers already sent, delegate to default Express handler to avoid double‑send exception
  if (res.headersSent) {
    return next(err)
  }

  logger.error(err)

  const normalizedError = toBaseError(err)

  // Abstract if setup gets more complicated
  const stack = config.isDev ? normalizedError.stack?.split('\n') : undefined
  const code = mapStatus(normalizedError)
  res.status(code).json({
    error: {
      type: normalizedError.type,
      code: code,
      message: normalizedError.message,
      details: {
        stack,
        url: req.originalUrl,
      },
    },
  })
}

/**
 * Maps a BaseError kind to the corresponding HTTP status code.
 * @param {BaseError} e - The application error to map.
 * @returns {number} HTTP status code representing the error kind.
 */
function mapStatus(e: BaseError): number {
  switch (e.kind) {
    case ErrorKinds.auth:
      return 401
    case ErrorKinds.validation:
      return 422
    case ErrorKinds.conflict:
      return 409
    case ErrorKinds.domain:
    case ErrorKinds.system:
    default:
      return 500
  }
}
