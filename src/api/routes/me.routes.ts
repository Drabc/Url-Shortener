import { Handler, Router } from 'express'

import { ShortenerController } from '@api/controllers/shortener.controller.js'

/**
 * Creates a router for authenticated user ("me") operations.
 * @param {ShortenerController} controller - The shortener controller handling logic.
 * @param {Handler} authMiddleware - Middleware to enforce authentication.
 * @param {Handler} rateLimitMiddleware - Middleware to apply rate limiting to the /me endpoints.
 * @returns {Router} - The configured router for /me endpoints.
 */
export function createMeRouter(
  controller: ShortenerController,
  authMiddleware: Handler,
  rateLimitMiddleware: Handler,
): Router {
  const meRouter = Router()

  /**
   * @openapi
   * /me/shorten:
   *  post:
   *    summary: Create a new short URL owned by the authenticated user
   *    security:
   *      - bearerAuth: []
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
   *              $ref: '#/components/schemas/ErrorFormat'
   *      '401':
   *        $ref: '#/components/responses/UnauthorizedError'
   *      '422':
   *        description: Invalid URL supplied
   *        content:
   *          application/json:
   *            schema:
   *              $ref: '#/components/schemas/ErrorFormat'
   *      '429':
   *        $ref: '#/components/responses/RateLimitExceeded'
   *      '500':
   *        $ref: '#/components/responses/SystemError'
   */
  meRouter.post('/me/shorten', authMiddleware, rateLimitMiddleware, (req, res) =>
    controller.shorten(req, res),
  )

  return meRouter
}
