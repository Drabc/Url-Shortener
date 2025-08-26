import { Router } from 'express'

import { UserController } from '@presentation/controllers/users.controller.js'

/**
 * Creates and configures the user router.
 * @param {UserController} controller UserController handling user-related requests.
 * @returns {Router} Express Router with user routes registered.
 */
export function createUserRouter(controller: UserController): Router {
  const userRouter = Router()

  /**
   * @openapi
   * /users:
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
   *       '400':
   *         description: Validation error (invalid email or password rules)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   *       '409':
   *         description: User already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorFormat'
   */
  userRouter.post('/users', controller.register.bind(controller))

  return userRouter
}
