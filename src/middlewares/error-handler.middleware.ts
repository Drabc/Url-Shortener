import { NextFunction, Request, Response } from 'express'

import { ApiError } from '../shared/errors/api.error.js'
import { InvalidUrlError } from '../domain/errors/invalid-url.error.js'
import { ErrorType } from '../shared/errors/error-types.js'
import { logger } from '../infrastructure/logging/logger.js'
import { config } from '../config/config.js'

/**
 * Middleware for handling errors in the application.
 * It normalizes errors and sends a structured response to the client.
 * @param {Error} err - The error object thrown by the application.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the stack.
 * @returns {void}
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If headers already sent, delegate to default Express handler to avoid double‑send exception
  if (res.headersSent) {
    return next(err)
  }

  logger.error(err)

  let normalizedError

  // TODO: Add new errors and refactor this logic
  if (err instanceof ApiError) {
    normalizedError = err
  } else if (err instanceof InvalidUrlError) {
    normalizedError = new ApiError(err.message, ErrorType.INVALID_URL, 400, err)
  } else if (err instanceof Error) {
    normalizedError = new ApiError(
      err.message,
      ErrorType.INTERNAL_SERVER_ERROR,
      500,
      err,
    )
  } else {
    normalizedError = new ApiError(
      'Internal Server Error',
      ErrorType.INTERNAL_SERVER_ERROR,
      500,
    )
  }

  // Abstract if setup gets more complicated
  const stack = config.isDev ? normalizedError.stack?.split('\n') : undefined
  res.status(normalizedError.statusCode).json({
    error: {
      type: normalizedError.type,
      code: normalizedError.statusCode,
      message: normalizedError.message,
      details: {
        stack,
        url: req.originalUrl,
      },
    },
  })
}
