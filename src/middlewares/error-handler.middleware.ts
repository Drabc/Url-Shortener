import { NextFunction, Request, Response } from 'express'

import { ApiError } from '../shared/errors/api.error.js'

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

  // Temporary: integrate pino
  console.error(err)

  let normalizedError

  if (err instanceof ApiError) {
    normalizedError = err
  } else if (err instanceof Error) {
    normalizedError = new ApiError(err.message, 500, err)
  } else {
    normalizedError = new ApiError('Internal Server Error', 500)
  }

  // Temporary for dev. Use different error fomatter based on env
  res.status(normalizedError.statusCode).json({
    error: {
      code: normalizedError.statusCode,
      message: normalizedError.message,
      details: {
        stack: normalizedError.stack?.split('\n'),
        url: req.originalUrl,
      },
    },
  })
}
