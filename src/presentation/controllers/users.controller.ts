import { Request, Response } from 'express'

import { UserDTO } from '@application/use-cases/dtos.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'

/**
 * Controller responsible for handling user related operations.
 * @param {RegisterUser} registerUser Use case for registering a new user.
 */
export class UserController {
  constructor(private registerUser: RegisterUser) {}

  /**
   * Registers a new user.
   * @param {Request} req Express request containing the user data (UserDTO) in the body.
   * @param {Response} res Express response used to send the creation status.
   * @returns {Promise<void>} Promise that resolves when the user registration process is initiated.
   */
  async register(req: Request, res: Response): Promise<void> {
    const userDto: UserDTO = req.body
    await this.registerUser.exec(userDto)
    res.status(201).send()
  }
}
