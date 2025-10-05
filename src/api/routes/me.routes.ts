import { Router } from 'express'

import { ShortenerController } from '@api/controllers/shortener.controller.js'
import { requireAuth } from '@api/middlewares/require-auth.middleware.js'
import { IJwtVerifier } from '@application/ports/jwt-verifier.js'

/**
 * Creates a router for authenticated user ("me") operations.
 * @param {ShortenerController} controller - The shortener controller handling logic.
 * @param {IJwtVerifier} verifier - JWT verifier used to authenticate requests.
 * @returns {Router} - The configured router for /me endpoints.
 */
export function createMeRouter(controller: ShortenerController, verifier: IJwtVerifier): Router {
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
   *           schema:
   *             type: object
   *             properties:
   *               url:
   *                 type: string
   *    responses:
   *      '201':
   *        description: The shortened URL
   *        content:
   *          'application/json':
   *            schema:
   *              $ref: '#/components/schemas/ErrorFormat'
   *      '401':
   *        description: Unauthorized
   *        content:
   *          'application/json':
   *            schema:
   *              $ref: '#/components/schemas/ErrorFormat'
   *      '500':
   *        $ref: '#/components/responses/SystemError'
   */
  meRouter.post('/me/shorten', requireAuth(verifier), (req, res) => controller.shorten(req, res))

  return meRouter
}
