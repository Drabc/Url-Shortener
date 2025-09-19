import { createHmac, timingSafeEqual } from 'crypto'

import { Digest, ITokenDigester } from '@domain/utils/token-digester.js'
import { UnsupportedHmacAlgorithmError } from '@infrastructure/errors/unsupported-hmac-algorithm.error.js'

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
    private readonly secret: string,
    private readonly hmacFactory: HmacFactory = createHmac,
    private readonly algo: string = 'sha256',
  ) {
    if (!SUPPORTED_ALGOS.includes(this.algo)) {
      throw new UnsupportedHmacAlgorithmError(this.algo, SUPPORTED_ALGOS)
    }
  }

  /**
   * Produces a hexadecimal HMAC digest of the provided plain text using the configured algorithm and secret.
   * @param {Buffer} plain Plain Buffer input to be digested.
   * @returns {Digest} A simple object containing the hash and algorithm used.
   */
  digest(plain: Buffer): Digest {
    return { value: this.compute(plain, this.algo), algo: this.algo }
  }

  /**
   * Verifies that the given plain text produces the provided hex HMAC hash using a timing-safe comparison.
   * @param {Buffer} plain Plain buffer input to verify.
   * @param {Digest} digest A simple object containing hash and algo used.
   * @returns {boolean} True if the computed digest matches the provided hash.
   */
  verify(plain: Buffer, digest: Digest): boolean {
    const computed = this.compute(plain, digest.algo)
    // Avoids exception from timingSafeEqual
    if (computed.length !== digest.value.length) return false
    return timingSafeEqual(computed, digest.value)
  }

  /**
   * Computes the raw HMAC digest buffer for the supplied plain text using the configured algorithm and secret.
   * @param {Buffer} plain Plain buffer to digest.
   * @returns {Buffer} Raw HMAC digest buffer.
   */
  private compute(plain: Buffer, algo: string): Buffer {
    return this.hmacFactory(algo, this.secret).update(plain).digest()
  }
}
