import { Router } from 'express'

import { ShortenerController } from '../controllers/shortener.controller.js'

export function createShortenerRouter(controller: ShortenerController): Router {
  const shortenerRouter = Router()

  /**
   * @openapi
   * /shorten:
   *  post:
   *    summary: Create a new short URL
   *    requestBody:
   *      required: true
   *      content:
   *         application/json:
   *           examples:
   *              long-url:
   *                value:
   *                  url: https://example.com/long/url
   *           schema:
   *             type: object
   *             properties:
   *               url:
   *                 type: string
   *    responses:
   *      '201':
   *        description: The shorten URL
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                shortUrl:
   *                  type: string
   *      '400':
   *        description: Invalid URL format
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/ErrorFormat'
   *
   */
  shortenerRouter.post('/shorten', controller.shorten.bind(controller))

  return shortenerRouter
}
