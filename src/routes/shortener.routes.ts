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
   *              type: object
   *              properties:
   *                error:
   *                  type: object
   *                  properties:
   *                    type:
   *                      type: string
   *                    code:
   *                      type: integer
   *                    message:
   *                      type: string
   *                    details:
   *                      type: object
   *                      properties:
   *                        url:
   *                          type: string
   *
   */
  shortenerRouter.post('/shorten', controller.shorten.bind(controller))

  return shortenerRouter
}
