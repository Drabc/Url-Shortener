import { Handler, Router } from 'express'

import { ShortenerController } from '@api/controllers/shortener.controller.js'

/**
 * Creates a router for URL shortening operations.
 * @param {ShortenerController} controller - The controller to handle URL shortening logic.
 * @param {Handler} rateLimitMiddleware - Middleware to apply rate limiting to the shortening endpoint.
 * @returns {Router} - The configured router for public URL shortening.
 */
export function createShortenerRouter(
  controller: ShortenerController,
  rateLimitMiddleware: Handler,
): Router {
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
   *        description: The shortened URL
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                shortUrl:
   *                  type: string
   *      '422':
   *        description: Invalid URL format
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/ErrorFormat'
   *      '429':
   *        $ref: '#/components/responses/RateLimitExceeded'
   *      '500':
   *        $ref: '#/components/responses/SystemError'
   */
  shortenerRouter.post('/shorten', rateLimitMiddleware, controller.shorten.bind(controller))

  return shortenerRouter
}
