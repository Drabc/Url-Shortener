import { Request, Response } from 'express'

import { ShortenerService } from '../application/services/shortener.service.js'

export class ShortenerController {
  constructor(private shortenerService: ShortenerService) {}

  public async shorten(req: Request, res: Response) {
    const { url } = req.body
    res
      .status(201)
      .send({ shortUrl: await this.shortenerService.shortenUrl(url) })
  }

  public async resolve(req: Request, res: Response) {
    const code = req.params.code
    const redirectUrl = await this.shortenerService.resolveUrl(code)
    res.redirect(redirectUrl)
  }
}
