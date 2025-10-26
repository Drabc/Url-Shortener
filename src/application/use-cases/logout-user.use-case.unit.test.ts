import { vi, Mocked } from 'vitest'

import { ISessionRepository } from '@domain/repositories/session.repository.interface.js'
import { ITokenDigester } from '@domain/utils/token-digester.js'
import { Clock } from '@application/shared/clock.js'
import { FingerPrint } from '@application/dtos.js'
import { Session } from '@domain/entities/auth/session.js'
import { Ok } from '@shared/result.js'

import { LogoutUser } from './logout-user.use-case.js'

describe('LogoutUser', () => {
  let logoutUser: LogoutUser
  let mockSessionRepo: Mocked<ISessionRepository>
  let mockTokenDigester: Mocked<ITokenDigester>
  let mockClock: Mocked<Clock>

  const userId = 'user-123'
  const now = new Date('2023-01-01T00:00:00Z')
  const fingerPrint: FingerPrint = {
    clientId: 'desktop',
    ip: '192.168.1.1',
    rawUa: 'Mozilla/5.0',
  }

  beforeEach(() => {
    mockSessionRepo = {
      findActiveByUserId: vi.fn(),
      findSessionForRefresh: vi.fn(),
      save: vi.fn(),
    }

    mockTokenDigester = {
      digest: vi.fn(),
      verify: vi.fn(),
    } as Mocked<ITokenDigester>

    mockClock = {
      now: vi.fn().mockReturnValue(now),
    } as Mocked<Clock>

    logoutUser = new LogoutUser(mockSessionRepo, mockTokenDigester, mockClock)
    // Default successful persistence Result for tests that trigger a save
    mockSessionRepo.save.mockResolvedValue(Ok(undefined))
  })

  describe('logoutSession()', () => {
    it('should do nothing when no refresh token is provided', async () => {
      const res = await logoutUser.logoutSession(userId, fingerPrint)
      expect(res).toEqual(Ok(undefined))
      expect(mockSessionRepo.findActiveByUserId).not.toHaveBeenCalled()
      expect(mockSessionRepo.save).not.toHaveBeenCalled()
    })

    it('should revoke the matching session when valid refresh token is provided', async () => {
      const refreshToken = Buffer.from('refresh-token-123')
      const mockSession = {
        clientId: 'desktop',
        hasActiveRefreshToken: vi.fn().mockReturnValue(true),
        revoke: vi.fn(),
      } as unknown as Session

      mockSessionRepo.findActiveByUserId.mockResolvedValue([mockSession])

      const res = await logoutUser.logoutSession(userId, fingerPrint, refreshToken)

      expect(mockSessionRepo.findActiveByUserId).toHaveBeenCalledWith(userId)
      expect(mockSession.hasActiveRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        mockTokenDigester,
      )
      expect(mockSession.revoke).toHaveBeenCalledWith(now, 'user_logout')
      expect(mockSessionRepo.save).toHaveBeenCalledWith(mockSession)
      expect(res.ok).toBe(true)
    })

    it('should not revoke session when client ID does not match', async () => {
      const refreshToken = Buffer.from('refresh-token-123')
      const mockSession = {
        clientId: 'mobile', // Different client ID
        hasActiveRefreshToken: vi.fn(),
        revoke: vi.fn(),
      } as unknown as Session

      mockSessionRepo.findActiveByUserId.mockResolvedValue([mockSession])

      const res = await logoutUser.logoutSession(userId, fingerPrint, refreshToken)

      expect(mockSession.hasActiveRefreshToken).not.toHaveBeenCalled()
      expect(mockSession.revoke).not.toHaveBeenCalled()
      expect(mockSessionRepo.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })

    it('should not revoke session when refresh token does not match', async () => {
      const refreshToken = Buffer.from('invalid-token')
      const mockSession = {
        clientId: 'desktop',
        hasActiveRefreshToken: vi.fn().mockReturnValue(false),
        revoke: vi.fn(),
      } as unknown as Session

      mockSessionRepo.findActiveByUserId.mockResolvedValue([mockSession])

      const res = await logoutUser.logoutSession(userId, fingerPrint, refreshToken)

      expect(mockSession.hasActiveRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        mockTokenDigester,
      )
      expect(mockSession.revoke).not.toHaveBeenCalled()
      expect(mockSessionRepo.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })

    it('should handle multiple sessions and revoke only the matching one', async () => {
      const refreshToken = Buffer.from('refresh-token-123')
      const matchingSession = {
        clientId: 'desktop',
        hasActiveRefreshToken: vi.fn().mockReturnValue(true),
        revoke: vi.fn(),
      } as unknown as Session

      const nonMatchingSession = {
        clientId: 'mobile',
        hasActiveRefreshToken: vi.fn(),
        revoke: vi.fn(),
      } as unknown as Session

      mockSessionRepo.findActiveByUserId.mockResolvedValue([matchingSession, nonMatchingSession])

      const res = await logoutUser.logoutSession(userId, fingerPrint, refreshToken)

      expect(matchingSession.revoke).toHaveBeenCalledWith(now, 'user_logout')
      expect(nonMatchingSession.revoke).not.toHaveBeenCalled()
      expect(mockSessionRepo.save).toHaveBeenCalledWith(matchingSession)
      expect(mockSessionRepo.save).toHaveBeenCalledTimes(1)
      expect(res.ok).toBe(true)
    })
  })

  describe('logoutAllSessions()', () => {
    it('should revoke all active sessions for the user', async () => {
      const session1 = {
        revoke: vi.fn(),
      } as unknown as Session

      const session2 = {
        revoke: vi.fn(),
      } as unknown as Session

      mockSessionRepo.findActiveByUserId.mockResolvedValue([session1, session2])

      const res = await logoutUser.logoutAllSessions(userId)

      expect(mockSessionRepo.findActiveByUserId).toHaveBeenCalledWith(userId)
      expect(session1.revoke).toHaveBeenCalledWith(now, 'global_logout')
      expect(session2.revoke).toHaveBeenCalledWith(now, 'global_logout')
      expect(mockSessionRepo.save).toHaveBeenCalledWith(session1)
      expect(mockSessionRepo.save).toHaveBeenCalledWith(session2)
      expect(mockSessionRepo.save).toHaveBeenCalledTimes(2)
      expect(res.ok).toBe(true)
    })

    it('should handle empty sessions list gracefully', async () => {
      mockSessionRepo.findActiveByUserId.mockResolvedValue([])

      const res = await logoutUser.logoutAllSessions(userId)

      expect(mockSessionRepo.findActiveByUserId).toHaveBeenCalledWith(userId)
      expect(mockSessionRepo.save).not.toHaveBeenCalled()
      expect(res.ok).toBe(true)
    })
  })
})
