import { BaseError, ErrorCategories } from '@shared/errors.js'

/**
 * Thrown when a client fails to initialize/connect
 * @param {string} key - The client key that failed to initialize
 * @param {string} [details] - Optional additional details about the failure
 * @augments {BaseError}
 */
export class ClientInitializationError extends BaseError {
  constructor(key: string, details?: string) {
    super(
      ErrorCategories.internal_error,
      'CLIENT_INIT_FAILURE',
      `Failed to initialize client '${key}' ${details ? `: ${details}` : ''}`,
    )
    this.name = 'ClientInitializationError'
  }
}

/**
 * Thrown when attempting to retrieve a client that hasn't been registered
 * @param {string} key - The client key that was not found
 * @augments {BaseError}
 */
export class ClientNotRegisteredError extends BaseError {
  constructor(key: string) {
    super(
      ErrorCategories.internal_error,
      'CLIENT_NOT_REGISTERED',
      `Client '${key}' has not been registered`,
    )
    this.name = 'ClientNotRegisteredError'
  }
}

/**
 * Thrown when trying to register a client with a key that isn't supported
 * @param {string} key - The unsupported client key
 * @augments {BaseError}
 */
export class UnsupportedClientKeyError extends BaseError {
  constructor(key: string) {
    super(
      ErrorCategories.internal_error,
      'UNSUPPORTED_CLIENT_KEY',
      `Unsupported client key '${key}'`,
    )
    this.name = 'UnsupportedClientKeyError'
  }
}

/**
 * Thrown when trying to register a client for a key that already has one
 * @param {string} key - The client key that is already registered
 * @augments {BaseError}
 */
export class DuplicateClientRegistrationError extends BaseError {
  constructor(key: string) {
    super(
      ErrorCategories.internal_error,
      'DUPLICATE_CLIENT_REGISTRATION',
      `Client for key '${key}' is already registered`,
    )
    this.name = 'DuplicateClientRegistrationError'
  }
}

/**
 * Thrown when a client fails to disconnect/close cleanly
 * @param {string} key - The client key that failed to disconnect
 * @param {string} [details] - Optional additional details about the failure
 * @augments {BaseError}
 */
export class ClientDisconnectError extends BaseError {
  constructor(key: string, details?: string) {
    super(
      ErrorCategories.internal_error,
      'CLIENT_DISCONNECT_FAILURE',
      `Failed to disconnect client '${key}' ${details ? `: ${details}` : ''}`,
    )
    this.name = 'ClientDisconnectError'
  }
}
