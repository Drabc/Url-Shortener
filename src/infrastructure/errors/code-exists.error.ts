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
