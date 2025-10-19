import { AnyError } from '@shared/errors.js'
import { formatError, JsonErrorFormat } from '@api/utils/error-formatter.js'

export const toHttp = (error: AnyError): { status: number; body: JsonErrorFormat } => {
  switch (error.category) {
    case 'unauthorized':
      return {
        status: 401,
        body: formatError(error.type, 401, error.message ?? 'Authentication Error'),
      }
    case 'duplicate':
    case 'conflict':
      return { status: 409, body: formatError(error.type, 409, error.message ?? 'Conflict Error') }
    case 'validation':
      return {
        status: 422,
        body: formatError(error.type, 422, error.message ?? 'Validation Error'),
      }
    case 'internal_error':
      return { status: 500, body: formatError(error.type, 500, 'Internal Error') }
    default:
      return { status: 500, body: formatError(error.type, 500, 'Unknown Error') }
  }
}
