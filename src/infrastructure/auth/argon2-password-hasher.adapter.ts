import * as argon2 from 'argon2'

import { IPasswordHasher } from '@application/ports/password-hasher.port.js'

export type Argon2Like = Pick<typeof argon2, 'hash' | 'verify'>

/**
 * Adapter for hashing and verifying passwords using Argon2id.
 * @param {string} pepper Ensures leaked hashes are not verifiable without this secret.
 * @param {Argon2Like} lib The Argon2 implementation. Defaults to argon2 module.
 */
export class Argon2PasswordHasher implements IPasswordHasher {
  private readonly pepper: Buffer

  constructor(
    pepper: string,
    private readonly lib: Argon2Like = argon2,
  ) {
    this.pepper = Buffer.from(pepper)
  }

  /**
   * Hashes a plain password using Argon2id with a secret pepper.
   * @param {string} plain - The plain password to hash.
   * @returns {Promise<string>} A promise that resolves to the hashed password string.
   */
  public hash(plain: string): Promise<string> {
    return this.lib.hash(plain, { secret: this.pepper })
  }

  /**
   * Verifies a plain password against a hashed password using Argon2id and the secret pepper.
   * @param {string} plain - The plain password to verify.
   * @param {string} hash - The hashed password to compare against.
   * @returns {Promise<boolean>} A promise that resolves to true if the password matches, false otherwise.
   */
  public verify(plain: string, hash: string): Promise<boolean> {
    return this.lib.verify(hash, plain, { secret: this.pepper })
  }
}
