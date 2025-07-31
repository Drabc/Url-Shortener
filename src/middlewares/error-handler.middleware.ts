import { NextFunction, Request, Response } from 'express'

import { ApiError } from '../shared/errors/api.error.js'
import { InvalidUrlError } from '../domain/errors/invalid-url.error.js'
import { ErrorType } from '../shared/errors/error-types.js'
import { logger } from '../infrastructure/logging/logger.js'
import { config } from '../config/config.js'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
    normalizedError = new ApiError(err.message, 400, ErrorType.INVALID_URL, err)
  } else if (err instanceof Error) {
    normalizedError = new ApiError(
      err.message,
      500,
      ErrorType.INTERNAL_SERVER_ERROR,
      err,
    )
  } else {
    normalizedError = new ApiError(
      'Internal Server Error',
      500,
      ErrorType.INTERNAL_SERVER_ERROR,
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
