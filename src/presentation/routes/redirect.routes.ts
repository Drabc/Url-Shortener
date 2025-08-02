import { Router } from 'express'

import { ShortenerController } from '@presentation/controllers/shortener.controller.js'

/**
 * Creates a router for redirect operations.
 * @param {ShortenerController} shortenerController - The controller to handle URL resolution logic.
 * @returns {Router} - The configured router for redirects.
 */
export function createRedirectRoutes(
  shortenerController: ShortenerController,
): Router {
  const redirectRouter = Router()

  /**
   * @openapi
   *
   * /{code}:
   *   x-unversioned: true
   *   get:
   *     summary: Redirects to the url associated with the code
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: The short url code
   *     responses:
   *       '301':
   *         description: Redirect to the short url
   *         headers:
   *           Location:
   *             schema:
   *               type: string
   *         content:
   *           text/html:
   *             schema:
   *               type: string
   *       '404':
   *         description: The code was not associated with any URL
   *         content:
   *           'application/json':
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   */
  redirectRouter.get(
    '/:code',
    shortenerController.resolve.bind(shortenerController),
  )

  return redirectRouter
}
