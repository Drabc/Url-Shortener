/**
 * Persistence Error thrown when a short URL code already exists.
 * @param {string} shortCode - The short URL code that already exists.
 * @augments {Error}
 */
export class CodeExistsError extends Error {
  constructor(shortCode: string) {
    super(`Short URL code "${shortCode}" already exists.`)
  }
}

/**
 * Persistence Error thrown when attempting to change an immutable short URL code.
 * @augments {Error}
 */
export class ImmutableCodeError extends Error {
  constructor() {
    super('Short URL codes are immutable and cannot be changed once set.')
  }
}
