import { Request, Response } from 'express'

import { ShortenerService } from '@application/services/shortener.service.js'

/**
 * Controller for handling URL shortening and resolution requests.
 * @param {ShortenerService} shortenerService - The service for URL shortening and resolution.
 */
export class ShortenerController {
  constructor(private shortenerService: ShortenerService) {}

  /**
   * Handles the request to shorten a URL.
   * @param {Request} req - The request object containing the URL to shorten.
   * @param {Response} res - The response object to send the shortened URL.
   */
  public async shorten(req: Request, res: Response) {
    const { url } = req.body
    res.status(201).send({ shortUrl: await this.shortenerService.shortenUrl(url) })
  }

  /**
   * Handles the request to resolve a short code to its original URL.
   * @param {Request} req - The request object containing the short code.
   * @param {Response} res - The response object to redirect to the original URL.
   */
  public async resolve(req: Request, res: Response) {
    // Validate format based on code generator
    const code = req.params.code
    const redirectUrl = await this.shortenerService.resolveUrl(code)
    res.redirect(redirectUrl)
  }
}
