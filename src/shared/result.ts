export type Ok<T> = { ok: true; value: T }
export type Err<E> = { ok: false; error: E }
export type Result<T, E> = Ok<T> | Err<E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export const Ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const Err = <E>(error: E): Err<E> => ({ ok: false, error })

export const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? fn(result.value) : result)
