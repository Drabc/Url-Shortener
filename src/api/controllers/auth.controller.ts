import { CookieOptions, NextFunction, Request, Response } from 'express'

import { FingerPrint, UserDTO } from '@application/dtos.js'
import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { LoginUser } from '@application/use-cases/login-user.use-case.js'
import { LogoutUser } from '@application/use-cases/logout-user.use-case.js'
import { RefreshToken } from '@application/use-cases/refresh-token.use-case.js'
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
    private refreshToken: RefreshToken,
    private cookieFormatter: CookieFormatter,
    private isDev: boolean,
  ) {}

  /**
   * Registers a new user.
   * @param {Request} req Express request containing the user data (UserDTO) in the body.
   * @param {Response} res Express response used to send the creation status.
   * @param {NextFunction} next next handler
   * @returns {Promise<void>} Promise that resolves when the user registration process is initiated.
   */
  async register(
    req: Request<unknown, void, UserDTO>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userDto = req.body
    const result = await this.registerUser.exec(userDto)

    if (!result.ok) return next(result.error)

    res.status(201).send()
  }

  /**
   * Authenticates a user and issues access/refresh tokens.
   * @param {Request} req Express request containing the user credentials (email, password) in the body.
   * @param {Response} res Express response used to return the access token and set the refresh token cookie.
   * @param {NextFunction} next next handler
   * @returns {Promise<void>} Promise that resolves after the authentication process completes.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body
    const fp = this.createFingerPrint(req)

    // Read previously issued refresh token (hex) if present to enable idempotent login path
    const presentedRefreshHex = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
    const presentedRefreshToken = this.cookieFormatter.safeDecodeRefreshToken(presentedRefreshHex)

    const result = await this.loginUser.exec(email, password, fp, presentedRefreshToken)

    if (!result.ok) return next(result.error)

    const { accessToken, refreshToken, expirationDate } = result.value

    this.createRefreshTokenCookie(res, refreshToken, expirationDate)
    // TODO: Add metadata type (Bearer), expiration time
    res.status(200).json({ accessToken })
  }

  /**
   * Logs out the current user session.
   * @param {Request} req Express request containing user ID from authentication middleware.
   * @param {Response} res Express response used to confirm logout and clear cookies.
   * @param {NextFunction} next next handler
   * @returns {Promise<void>} Promise that resolves after the logout process completes.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.userId!
    const fp = this.createFingerPrint(req)

    // Read refresh token from cookie
    const presentedRefreshHex = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
    const presentedRefreshToken = this.cookieFormatter.safeDecodeRefreshToken(presentedRefreshHex)

    const result = await this.logoutUser.logoutSession(userId, fp, presentedRefreshToken)
    if (!result.ok) return next(result.error)

    // Clear the refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions())

    res.status(200).json({ message: 'Logged out successfully' })
  }

  /**
   * Logs out all user sessions globally.
   * @param {Request} req Express request containing user ID from authentication middleware.
   * @param {Response} res Express response used to confirm global logout.
   * @param {NextFunction} next next handler
   * @returns {Promise<void>} Promise that resolves after all sessions are revoked.
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const result = await this.logoutUser.logoutAllSessions(userId)
    if (!result.ok) return next(result.error)

    // Clear the refresh token cookie on this device too
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, this.getRefreshTokenCookieOptions())

    res.status(200).json({ message: 'Logged out from all devices successfully' })
  }

  /**
   * Rotates a valid refresh token and returns a new access token. Requires existing refresh token cookie.
   * @param {Request} req Express request containing userId (access token may still be valid or near expiry).
   * @param {Response} res Express response setting new refresh cookie and returning new access token.
   * @param {NextFunction} next next handler
   * @returns {Promise<void>}
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    const fp = this.createFingerPrint(req)
    const presentedHex = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined
    const presented = this.cookieFormatter.safeDecodeRefreshToken(presentedHex)
    if (!presented) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const result = await this.refreshToken.exec(fp, presented)

    if (!result.ok) return next(result.error)

    const { accessToken, refreshToken, expirationDate } = result.value!

    this.createRefreshTokenCookie(res, refreshToken, expirationDate)

    res.status(200).json({ accessToken })
  }

  /**
   * Sets the refresh token cookie with proper security flags and disables caching.
   * @param {Response} res Express response used to set the cookie and headers.
   * @param {Buffer} refreshToken Raw refresh token bytes to encode into the cookie.
   * @param {Date} expirationDate Expiration date reference used to derive cookie lifetime.
   */
  private createRefreshTokenCookie(res: Response, refreshToken: Buffer, expirationDate: Date) {
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      this.cookieFormatter.encodeRefreshToken(refreshToken),
      this.getRefreshTokenCookieOptions(expirationDate),
    )

    // Never cache tokens
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    res.setHeader('Pragma', 'no-cache')
  }

  /**
   * Gets the standard cookie options used for refresh tokens.
   * @param {Date} expires When the cookie expires
   * @returns {CookieOptions} Cookie options object with consistent security settings.
   */
  private getRefreshTokenCookieOptions(expires?: Date): CookieOptions {
    return {
      sameSite: 'lax' as const,
      httpOnly: true,
      secure: !this.isDev,
      ...(expires && { expires }),
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
