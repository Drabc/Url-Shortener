import { createHmac, timingSafeEqual } from 'crypto'

import { Digest, ITokenDigester } from '@domain/ports/token-digester.js'

type HmacFactory = typeof createHmac

const SUPPORTED_ALGOS = ['sha256', 'sha512']

/**
 * HMAC-based implementation of ITokenDigester.
 *
 * Uses Node's crypto.createHmac with the provided secret and algorithm
 * (defaults to 'sha256') to digest plain text and verify hashes using
 * a timing-safe comparison to mitigate timing attacks.
 * @implements {ITokenDigester}
 * @param {HmacFactory} hmacFactory Factory method for creating HMACs. Expects crypto.createHmac like
 * @param {string} secret Secret to be used with the HMAC function
 * @param {string} algo HMAC Algorithm to use (eg sha256, sha512). Default to sha256
 */
export class HmacTokenDigester implements ITokenDigester {
  constructor(
    private readonly hmacFactory: HmacFactory,
    private readonly secret: string,
    private readonly algo: string = 'sha256',
  ) {
    if (!SUPPORTED_ALGOS.includes(this.algo)) {
      throw new Error(
        `Unsupported HMAC algorithm: ${this.algo}. Supported algorithms: ${SUPPORTED_ALGOS.join(', ')}`,
      )
    }
  }

  /**
   * Produces a hexadecimal HMAC digest of the provided plain text using the configured algorithm and secret.
   * @param {string} plain Plain text input to be digested.
   * @returns {string} Hex-encoded HMAC digest of the input.
   */
  digest(plain: string): Digest {
    return { value: this.compute(plain, this.algo).toString('hex'), algo: this.algo }
  }

  /**
   * Verifies that the given plain text produces the provided hex HMAC hash using a timing-safe comparison.
   * @param {string} plain Plain text input to verify.
   * @param {string} hash Hex-encoded HMAC digest to compare against.
   * @returns {boolean} True if the computed digest matches the provided hash.
   */
  verify(plain: string, hash: Digest): boolean {
    const computed = this.compute(plain, hash.algo)
    const provided = Buffer.from(hash.value, 'hex')
    if (computed.length !== provided.length) return false
    return timingSafeEqual(computed, provided)
  }

  /**
   * Computes the raw HMAC digest buffer for the supplied plain text using the configured algorithm and secret.
   * @param {string} plain Plain text to digest.
   * @returns {Buffer} Raw HMAC digest buffer.
   */
  private compute(plain: string, algo: string): Buffer {
    return this.hmacFactory(algo, this.secret).update(plain).digest()
  }
}
