import { AnyError } from '@shared/errors.js'
import { AsyncResult } from '@shared/result.js'

export interface IUnitOfWork {
  run(fn: () => AsyncResult<void, AnyError>): Promise<void>
}
