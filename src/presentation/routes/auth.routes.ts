import { Router } from 'express'

import { AuthController } from '@presentation/controllers/auth.controller.js'
import { IUnitOfWork } from '@application/ports/unit-of-work.js'
import { withUnitOfWork } from '@presentation/utils/with-unit-of-work.js'

/**
 * Creates and configures the user router.
 * @param {AuthController} controller UserController handling user-related requests.
 * @param {IUnitOfWork} uow - Unit of Work controlling execution scope.
 * @returns {Router} Express Router with user routes registered.
 */
export function createAuthRouter(controller: AuthController, uow: IUnitOfWork): Router {
  const userRouter = Router()

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     summary: Register a new user
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
  userRouter.post('/auth/register', controller.register.bind(controller))

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Authenticate a user and start a session
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
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '422':
   *         description: Validation error (email or password)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '500':
   *         $ref: '#/components/responses/SystemError'
   */
  userRouter.post('/auth/login', withUnitOfWork(uow, controller.login.bind(controller)))

  return userRouter
}
