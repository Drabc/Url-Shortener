import { Request, Response } from 'express'

import { FingerPrint, UserDTO } from '@application/dtos.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { LoginUser } from '@application/use-cases/login-user.use-case.js'
import { LogoutUser } from '@application/use-cases/logout-user.use-case.js'
import { CookieFormatter } from '@api/utils/cookie-formatter.js'

const REFRESH_TOKEN_COOKIE_NAME = 'refresh-token' as const

/**
 * Controller responsible for handling user related operations.
 * @param {RegisterUser} registerUser Use case for registering a new user.
 * @param {LoginUser} loginUser Use case for logging in a user.
 * @param {LogoutUser} logoutUser Use case for logging out a user.
 * @param {CookieFormatter} cookieFormatter Utility for formatting cookie values.
 * @param {boolean} isDev Development mode flag.
 */
export class AuthController {
  constructor(
    private registerUser: RegisterUser,
    private loginUser: LoginUser,
    private logoutUser: LogoutUser,
    private cookieFormatter: CookieFormatter,
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
    const fp = this.createFingerPrint(req)

    // Read previously issued refresh token (hex) if present to enable idempotent login path
    const presentedRefreshHex = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
    const presentedRefreshToken = this.cookieFormatter.safeDecodeRefreshToken(presentedRefreshHex)

    const { accessToken, refreshToken } = await this.loginUser.exec(
      email,
      password,
      fp,
      presentedRefreshToken,
    )

    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      this.cookieFormatter.encodeRefreshToken(refreshToken),
      this.getRefreshTokenCookieOptions(),
    )

    // Never cache tokens
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')

    // TODO: Add metadata type (Bearer), expiration time
    res.status(200).json({ accessToken })
  }

  /**
   * Logs out the current user session.
   * @param {Request} req Express request containing user ID from authentication middleware.
   * @param {Response} res Express response used to confirm logout and clear cookies.
   * @returns {Promise<void>} Promise that resolves after the logout process completes.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.userId!
    const fp = this.createFingerPrint(req)

    // Read refresh token from cookie
    const presentedRefreshHex = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
    const presentedRefreshToken = this.cookieFormatter.safeDecodeRefreshToken(presentedRefreshHex)

    await this.logoutUser.logoutSession(userId, fp, presentedRefreshToken)

    // Clear the refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions())

    res.status(200).json({ message: 'Logged out successfully' })
  }

  /**
   * Logs out all user sessions globally.
   * @param {Request} req Express request containing user ID from authentication middleware.
   * @param {Response} res Express response used to confirm global logout.
   * @returns {Promise<void>} Promise that resolves after all sessions are revoked.
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    await this.logoutUser.logoutAllSessions(userId)

    // Clear the refresh token cookie on this device too
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions())

    res.status(200).json({ message: 'Logged out from all devices successfully' })
  }

  /**
   * Gets the standard cookie options used for refresh tokens.
   * @returns {object} Cookie options object with consistent security settings.
   */
  private getRefreshTokenCookieOptions() {
    return {
      sameSite: 'lax' as const,
      httpOnly: true,
      secure: !this.isDev,
      // Add path to only tie it to the refresh and logout endpoint
    }
  }

  /**
   * Creates a client fingerprint from the HTTP request.
   * @param {Request} req Express request containing client information.
   * @returns {FingerPrint} Client fingerprint object.
   */
  private createFingerPrint(req: Request): FingerPrint {
    const clientId = 'desktop' // Hard coded for now
    const ip =
      req.headers['X-Forwarded-For']?.toString().split(',')[0].trim() ??
      req.socket.remoteAddress ??
      ''

    return {
      clientId,
      ip,
      rawUa: req.get('User-Agent') ?? '',
    }
  }
}
