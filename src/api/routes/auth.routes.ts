import { Router } from 'express'

import { AuthController } from '@api/controllers/auth.controller.js'
import { IUnitOfWork } from '@application/ports/unit-of-work.js'
import { withUnitOfWork } from '@api/utils/with-unit-of-work.js'
import { requireAuth } from '@api/middlewares/require-auth.middleware.js'
import { IJwtVerifier } from '@application/ports/jwt-verifier.js'

/**
 * Creates and configures the user router.
 * @param {AuthController} controller UserController handling user-related requests.
 * @param {IUnitOfWork} uow - Unit of Work controlling execution scope.
 * @param {IJwtVerifier} verifier - JWT verifier used to authenticate requests.
 * @returns {Router} Express Router with user routes registered.
 */
export function createAuthRouter(
  controller: AuthController,
  uow: IUnitOfWork,
  verifier: IJwtVerifier,
): Router {
  const authRouter = Router()

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - firstName
   *               - lastName
   *               - email
   *               - password
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 description: Plain password to be hashed
   *           examples:
   *             new-user:
   *               value:
   *                 firstName: Jane
   *                 lastName: Doe
   *                 email: jane.doe@example.com
   *                 password: P@ssw0rd!
   *     responses:
   *       '201':
   *         description: User successfully registered
   *       '409':
   *         description: User already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '422':
   *         description: Email or Password is invalid
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  authRouter.post('/auth/register', controller.register.bind(controller))

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Authenticate a user and start a session
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *           examples:
   *             login:
   *               value:
   *                 email: jane.doe@example.com
   *                 password: P@ssw0rd!
   *     responses:
   *       '200':
   *         description: Authenticated
   *         headers:
   *           Set-Cookie:
   *             description: HTTP-only refresh token cookie (HttpOnly; Secure; SameSite=Strict).
   *             schema:
   *               type: string
   *             example: refreshToken=abcdef123456; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=2592000
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required:
   *                 - accessToken
   *               properties:
   *                 accessToken:
   *                   type: string
   *                   description: JWT access token
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '422':
   *         description: Validation error (email or password)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  authRouter.post('/auth/login', withUnitOfWork(uow, controller.login.bind(controller)))

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     summary: Rotate refresh token and obtain new access token
   *     tags:
   *       - Auth
   *     responses:
   *       '200':
   *         description: Token refreshed
   *         headers:
   *           Set-Cookie:
   *             description: Rotated HTTP-only refresh token cookie.
   *             schema:
   *               type: string
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               required:
   *                 - accessToken
   *               properties:
   *                 accessToken:
   *                   type: string
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  authRouter.post('/auth/refresh', withUnitOfWork(uow, controller.refresh.bind(controller)))

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     summary: Log out from the current session
   *     tags:
   *       - Auth
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Successfully logged out
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Logged out successfully
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  authRouter.post('/auth/logout', requireAuth(verifier), controller.logout.bind(controller))

  /**
   * @openapi
   * /auth/logout-all:
   *   post:
   *     summary: Log out from all sessions globally
   *     tags:
   *       - Auth
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Successfully logged out from all devices
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Logged out from all devices successfully
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  authRouter.post(
    '/auth/logout-all',
    requireAuth(verifier),
    withUnitOfWork(uow, controller.logoutAll.bind(controller)),
  )

  return authRouter
}
