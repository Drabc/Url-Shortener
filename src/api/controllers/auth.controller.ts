import { Request, Response } from 'express'

import { FingerPrint, UserDTO } from '@application/dtos.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { LoginUser } from '@application/use-cases/login-user.use-case.js'

/**
 * Controller responsible for handling user related operations.
 * @param {RegisterUser} registerUser Use case for registering a new user.
 */
export class AuthController {
  constructor(
    private registerUser: RegisterUser,
    private loginUser: LoginUser,
    private isDev: boolean,
  ) {}

  /**
   * Registers a new user.
   * @param {Request} req Express request containing the user data (UserDTO) in the body.
   * @param {Response} res Express response used to send the creation status.
   * @returns {Promise<void>} Promise that resolves when the user registration process is initiated.
   */
  async register(req: Request<unknown, void, UserDTO>, res: Response): Promise<void> {
    const userDto = req.body
    await this.registerUser.exec(userDto)
    res.status(201).send()
  }

  /**
   * Authenticates a user and issues access/refresh tokens.
   * @param {Request} req Express request containing the user credentials (email, password) in the body.
   * @param {Response} res Express response used to return the access token and set the refresh token cookie.
   * @returns {Promise<void>} Promise that resolves after the authentication process completes.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body
    const clientId = 'desktop' //Hard coded for now
    const ip =
      req.headers['X-Forwarded-For']?.toString().split(',')[0].trim() ??
      req.socket.remoteAddress ??
      ''

    const fp: FingerPrint = {
      clientId,
      ip,
      rawUa: req.get('User-Agent') ?? '',
    }

    // Read previously issued refresh token (hex) if present to enable idempotent login path
    const presentedRefreshHex = req.cookies?.['refresh-token'] as string | undefined
    const presentedRefreshToken = presentedRefreshHex
      ? Buffer.from(presentedRefreshHex, 'hex')
      : undefined

    const { accessToken, refreshToken } = await this.loginUser.exec(
      email,
      password,
      fp,
      presentedRefreshToken,
    )

    // TODO: Use formatter for hex
    res.cookie('refresh-token', refreshToken.toString('hex'), {
      sameSite: 'lax',
      httpOnly: true,
      secure: !this.isDev, // unsecure in dev to avoid using https
      // Add path to only tie it to the refresh endpoint
    })

    // Never cache tokens
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')

    // TODO: Add metadata type (Bearer), expiration time
    res.status(200).json({ accessToken })
  }
}
