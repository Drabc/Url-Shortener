import { BaseError, ErrorKinds } from '../../shared/errors.js'

/**
 * Persistence Error thrown when a short URL code already exists.
 * @param {string} shortCode - The short URL code that already exists.
 * @augments {BaseError}
 */
export class CodeExistsError extends BaseError {
  constructor(shortCode: string) {
    super(
      ErrorKinds.conflict,
      'CODE_EXISTS',
      `Short URL code "${shortCode}" already exists.`,
    )
    this.name = 'CodeExistsError'
  }
}

/**
 * Persistence Error thrown when attempting to change an immutable short URL code.
 * @augments {BaseError}
 */
export class ImmutableCodeError extends BaseError {
  constructor() {
    super(
      ErrorKinds.conflict,
      'IMMUTABLE_CODE',
      'Short URL codes are immutable and cannot be changed once set.',
    )
    this.name = 'ImmutableCodeError'
  }
}

/**
 * Persistence Error thrown when attempting to create an entity that already exists.
 * @param {string} [entity='Entity'] - The name of the entity that already exists.
 * @augments {BaseError}
 */
export class EntityAlreadyExistsError extends BaseError {
  constructor(entity: string = 'Entity') {
    super(
      ErrorKinds.conflict,
      'ENTITY_ALREADY_EXISTS',
      `${entity} already exists`,
    )
    this.name = 'EntityAlreadyExistsError'
  }
}
