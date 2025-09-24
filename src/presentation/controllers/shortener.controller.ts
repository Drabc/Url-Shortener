import { Request, Response } from 'express'

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
   */
  public async shorten(req: Request, res: Response) {
    const { url } = req.body
    res.status(201).send({ shortUrl: await this.shortenUrlUC.shortenUrl(url, req.userId) })
  }

  /**
   * Handles the request to resolve a short code to its original URL.
   * @param {Request} req - The request object containing the short code.
   * @param {Response} res - The response object to redirect to the original URL.
   */
  public async resolve(req: Request, res: Response) {
    // Validate format based on code generator
    const code = req.params.code
    const redirectUrl = await this.resolveUrlUC.resolveUrl(code)
    res.redirect(redirectUrl)
  }
}
