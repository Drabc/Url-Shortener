import { NextFunction, Request, Response } from 'express'

import { logger } from '@infrastructure/logging/logger.js'
import { config } from '@infrastructure/config/config.js'
import { BaseError, ErrorCategories } from '@shared/errors.js'
import { toBaseError } from '@shared/normalize-error.js'
import { formatError } from '@api/utils/error-formatter.js'

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
  const details = { stack, url: req.originalUrl }
  const code = mapStatus(normalizedError)
  res.status(code).json(formatError(normalizedError.type, code, normalizedError.message, details))
}

/**
 * Maps a BaseError kind to the corresponding HTTP status code.
 * @param {BaseError} e - The application error to map.
 * @returns {number} HTTP status code representing the error kind.
 */
function mapStatus(e: BaseError): number {
  switch (e.category) {
    case ErrorCategories.unauthorized:
      return 401
    case ErrorCategories.validation:
      return 422
    case ErrorCategories.conflict:
      return 409
    case ErrorCategories.unknown:
    case ErrorCategories.internal_error:
    default:
      return 500
  }
}
