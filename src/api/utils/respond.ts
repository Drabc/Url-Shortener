import { Response } from 'express'

import { Ok, Result } from '@shared/result.js'
import { toHttp } from '@api/utils/to-http.js'
import { AnyError } from '@shared/errors.js'

export const respond = <T, E extends AnyError>(
  res: Response,
  result: Result<T, E>,
  onOk?: (value: T) => void,
): Result<void, E> => {
  if (result.ok) {
    if (onOk) return Ok(onOk(result.value))
    res.status(204).send()
    return Ok(undefined)
  }

  const { status, body } = toHttp(result.error)
  res.status(status).json(body)
  return result as Result<void, E>
}
