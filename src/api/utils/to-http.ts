import { AnyError } from '@shared/errors.js'
import { formatError, JsonErrorFormat } from '@api/utils/error-formatter.js'
import { config } from '@infrastructure/config/config.js'

/**
 * Convert an application {@link AnyError} into an HTTP-friendly structure.
 *
 * Category mapping rules:
 * - unauthorized    -> 401 Authentication Error
 * - not_found       -> 404 Resource Not Found
 * - duplicate|conflict -> 409 Conflict Error
 * - validation      -> 422 Validation Error
 * - rate_limited    -> 429 Rate Limit Exceeded
 * - internal_error  -> 500 Internal Error
 * - (default)       -> 500 Unknown Error
 *
 * In non-prod mode (`config.NonProd`) the returned object is augmented with a `cause` field
 * containing the original error cause (if present) to aid debugging; this field is omitted in
 * production to avoid leaking internal details.
 * @param {AnyError} error Application error instance to translate.
 * @returns {{ status: number; body: JsonErrorFormat }} HTTP status code and formatted error body.
 */
export const toHttp = (error: AnyError): { status: number; body: JsonErrorFormat } => {
  let response: { status: number; body: JsonErrorFormat }

  switch (error.category) {
    case 'unauthorized':
      response = {
        status: 401,
        body: formatError(error.type, 401, error.message ?? 'Authentication Error'),
      }
      break
    case 'not_found':
      response = {
        status: 404,
        body: formatError(error.type, 404, error.message ?? 'Resource Not Found'),
      }
      break
    case 'duplicate':
    case 'conflict':
      response = {
        status: 409,
        body: formatError(error.type, 409, error.message ?? 'Conflict Error'),
      }
      break
    case 'validation':
      response = {
        status: 422,
        body: formatError(error.type, 422, error.message ?? 'Validation Error'),
      }
      break
    case 'rate_limited':
      response = {
        status: 429,
        body: formatError(error.type, 429, error.message ?? 'Rate Limit Exceeded'),
      }
      break
    case 'internal_error':
      response = {
        status: 500,
        body: formatError(error.type, 500, 'Internal Error'),
      }
      break
    default:
      response = {
        status: 500,
        body: formatError(error.type, 500, 'Unknown Error'),
      }
      break
  }

  return {
    status: response.status,
    body: {
      ...response.body,
      ...(config.isNonProd ? { cause: error.cause } : {}),
    },
  }
}
