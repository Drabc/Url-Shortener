import { BaseError, ErrorKinds } from '@shared/errors.js'

/**
 * Error thrown when a token rotation is attempted on a session that is not active.
 * @augments {BaseError}
 */
export class SessionNotActiveError extends BaseError {
  constructor() {
    super(ErrorKinds.auth, 'SESSION_NOT_ACTIVE', 'Cannot rotate token on non-active session')
    this.name = 'SessionNotActiveError'
  }
}

/**
 * Error thrown when no active refresh token exists for the session during a rotation attempt.
 * @augments {BaseError}
 */
export class NoActiveRefreshTokenError extends BaseError {
  constructor() {
    super(ErrorKinds.auth, 'NO_ACTIVE_REFRESH_TOKEN', 'No active token found for session')
    this.name = 'NoActiveRefreshTokenError'
  }
}

/**
 * Error thrown when a token rotation is attempted on an expired session.
 * @augments {BaseError}
 */
export class SessionExpiredError extends BaseError {
  constructor() {
    super(ErrorKinds.auth, 'SESSION_EXPIRED', 'Cannot rotate token on expired session')
    this.name = 'SessionExpiredError'
  }
}

/**
 * Error thrown when refresh token reuse is detected during rotation.
 * @augments {BaseError}
 */
export class RefreshTokenReuseDetectedError extends BaseError {
  constructor() {
    super(ErrorKinds.auth, 'REFRESH_TOKEN_REUSE_DETECTED', 'Refresh token reuse detected')
    this.name = 'RefreshTokenReuseDetectedError'
  }
}
