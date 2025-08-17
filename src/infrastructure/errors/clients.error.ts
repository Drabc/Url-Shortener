/**
 * Errors for persistence client/connection lifecycle
 */

/**
 * Thrown when a client fails to initialize/connect
 */
export class ClientInitializationError extends Error {
  constructor(key: string, details?: string) {
    super(
      `Failed to initialize client '${key}' ${details ? `: ${details}` : ''}`,
    )
    this.name = 'ClientInitializationError'
  }
}

/**
 * Thrown when attempting to retrieve a client that hasn't been registered
 */
export class ClientNotRegisteredError extends Error {
  constructor(key: string) {
    super(`Client '${key}' has not been registered`)
    this.name = 'ClientNotRegisteredError'
  }
}

/**
 * Thrown when trying to register a client with a key that isn't supported
 */
export class UnsupportedClientKeyError extends Error {
  constructor(key: string) {
    super(`Unsupported client key '${key}'`)
    this.name = 'UnsupportedClientKeyError'
  }
}

/**
 * Thrown when trying to register a client for a key that already has one
 */
export class DuplicateClientRegistrationError extends Error {
  constructor(key: string) {
    super(`Client for key '${key}' is already registered`)
    this.name = 'DuplicateClientRegistrationError'
  }
}

/**
 * Thrown when a client fails to disconnect/close cleanly
 */
export class ClientDisconnectError extends Error {
  constructor(key: string, details?: string) {
    super(
      `Failed to disconnect client '${key}' ${details ? `: ${details}` : ''}`,
    )
    this.name = 'ClientDisconnectError'
  }
}
