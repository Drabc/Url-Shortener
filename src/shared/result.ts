import { AnyError } from '@shared/errors.js'

export type Result<T, E> = Ok<T, E> | Err<T, E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

interface Ok<T, E> {
  readonly ok: true
  readonly value: T
  andThen<U, F>(fn: (t: T) => Result<U, F>): Result<U, E | F>
  andThenAsync<U, F>(fn: (t: T) => AsyncResult<U, F>): AsyncResult<U, E | F>
  tap(effect: (t: T) => void): this
}

export interface Err<T, E> {
  readonly ok: false
  readonly error: E
  andThen<U, F>(_fn: (t: T) => Result<U, F>): Result<U, E | F>
  andThenAsync<U, F>(_fn: (t: T) => AsyncResult<U, F>): AsyncResult<U, F | E>
  tap(_effect: (t: T) => void): this
}

const okProto = {
  andThen<T, E, U, F>(this: Ok<T, E>, fn: (t: T) => Result<U, F>): Result<U, E | F> {
    return fn(this.value)
  },
  async andThenAsync<T, E, U, F>(
    this: Ok<T, E>,
    fn: (t: T) => AsyncResult<U, F>,
  ): AsyncResult<U, E | F> {
    return fn(this.value)
  },
  tap<T, E>(this: Ok<T, E>, effect: (t: T) => void) {
    effect(this.value)
    return this
  },
}

const errProto = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  andThen<T, E, U, F>(this: Err<T, E>, _fn: (t: T) => Result<U, F>): Result<T, E | F> {
    return this
  },
  async andThenAsync<T, E, U, F>(
    this: Err<T, E>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fn: (t: T) => AsyncResult<U, F>,
  ): AsyncResult<U, E | F> {
    // Widen generics: value type becomes U (unused) and error type becomes E | F
    return this as unknown as AsyncResult<U, E | F>
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tap<T, E>(this: Err<T, E>, _effect: (t: T) => void) {
    return this
  },
}

export const Ok = <T, E = never>(value: T): Ok<T, E> => {
  return Object.assign(Object.create(okProto), { ok: true as const, value })
}

export const Err = <T = never, E extends AnyError = AnyError>(error: E): Err<T, E> => {
  return Object.assign(Object.create(errProto), { ok: false as const, error })
}

export const all = <T, E extends AnyError>(...results: Result<T, E>[]): Result<T[], E> => {
  const out: T[] = []
  for (const result of results) {
    if (!result.ok) return Err<T[], E>(result.error)
    out.push(result.value)
  }
  return Ok(out)
}
