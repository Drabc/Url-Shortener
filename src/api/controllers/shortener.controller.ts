import { NextFunction, Request, Response } from 'express'

import { ShortenUrl } from '@application/use-cases/shorten-url.use-case.js'
import { ResolveUrl } from '@application/use-cases/resolve-url.use-case.js'

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
   * @param {NextFunction} next - Next handler
   * @returns {Promise<void>}
   */
  public async shorten(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { url } = req.body
    const result = await this.shortenUrlUC.shortenUrl(url, req.userId)

    if (!result.ok) return next(result.error)

    res.status(201).send({ shortUrl: result.value })
  }

  /**
   * Handles the request to resolve a short code to its original URL.
   * @param {Request} req - The request object containing the short code.
   * @param {Response} res - The response object to redirect to the original URL.
   * @param {NextFunction} next - Next handler
   * @returns {Promise<void>}
   */
  public async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate format based on code generator
    const code = req.params.code
    const result = await this.resolveUrlUC.resolveUrl(code)

    if (!result.ok) return next(result.error)

    res.redirect(result.value)
  }
}
