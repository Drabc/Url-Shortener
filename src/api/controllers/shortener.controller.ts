import { Request, Response } from 'express'

import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'
import { respond } from '@api/utils/respond.js'
import { AsyncResult } from '@shared/result.js'
import { AnyError } from '@shared/errors.js'

/**
 * Controller for handling URL shortening and resolution requests.
 * @param {ShortenUrl} shortenUrlUC - Use case for creating shortened URLs.
 * @param {ResolveUrl} resolveUrlUC - Use case for resolving short codes to original URLs.
 */
export class ShortenerController {
  constructor(
    private readonly shortenUrlUC: ShortenUrl,
    private readonly resolveUrlUC: ResolveUrl,
  ) {}

  /**
   * Handles the request to shorten a URL.
   * @param {Request} req - The request object containing the URL to shorten.
   * @param {Response} res - The response object to send the shortened URL.
   * @returns {AsyncResult<void, AnyError>} result
   */
  public async shorten(req: Request, res: Response): AsyncResult<void, AnyError> {
    const { url } = req.body
    const result = await this.shortenUrlUC.shortenUrl(url, req.userId)

    return respond(res, result, (code) => res.status(201).send({ shortUrl: code }))
  }

  /**
   * Handles the request to resolve a short code to its original URL.
   * @param {Request} req - The request object containing the short code.
   * @param {Response} res - The response object to redirect to the original URL.
   * @returns {AsyncResult<void, AnyError>} result
   */
  public async resolve(req: Request, res: Response): AsyncResult<void, AnyError> {
    const code = req.params.code
    return respond(res, await this.resolveUrlUC.resolveUrl(code), (longUrl: string) => {
      res.redirect(longUrl)
    })
  }
}
