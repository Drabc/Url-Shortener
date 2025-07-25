import { Request, Response } from 'express'
import { ShortenerService } from '../services/shortener.services.js'

export class ShortenerController {
  constructor(private shortenerService: ShortenerService) {}

  public async shorten(req: Request, res: Response) {
    const { url } = req.body
    // use response formatter
    res.status(201).send({ url: await this.shortenerService.shortenUrl(url) })
  }

  public async resolve(req: Request, res: Response) {
    const id = req.params.id
    const redirectUrl = await this.shortenerService.resolveUrl(id)
    res.redirect(redirectUrl)
  }
}
