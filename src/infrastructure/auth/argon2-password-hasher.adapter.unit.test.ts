import { vi, Mock } from 'vitest'

import {
  Argon2PasswordHasher,
  Argon2Like,
} from '@infrastructure/auth/argon2-password-hasher.adapter.js'
import { Password } from '@domain/value-objects/password.js'

describe('Argon2PasswordHasher', () => {
  const pepper = 'super-secret-pepper'
  let lib: { hash: Mock; verify: Mock }
  let hasher: Argon2PasswordHasher

  beforeEach(() => {
    lib = {
      hash: vi.fn(),
      verify: vi.fn(),
    }
    hasher = new Argon2PasswordHasher(pepper, lib as unknown as Argon2Like)
  })

  describe('hash()', () => {
    it('delegates to argon2.hash with pepper as secret', async () => {
      lib.hash.mockResolvedValue('$argon2id$hashvalue')

      const pwdRes = Password.create('Plain!Pass')
      expect(pwdRes.ok).toBe(true)
      const password = pwdRes.ok ? pwdRes.value : undefined
      if (!password) throw new Error('Password creation failed in test setup')

      const result = await hasher.hash(password)

      expect(lib.hash).toHaveBeenCalledWith('Plain!Pass', {
        secret: Buffer.from(pepper),
      })
      expect(result).toBe('$argon2id$hashvalue')
    })

    it('propagates errors from underlying hash', async () => {
      lib.hash.mockRejectedValue(new Error('boom'))
      const pwdRes = Password.create('Plain!Pass')
      expect(pwdRes.ok).toBe(true)
      const password = pwdRes.ok ? pwdRes.value : undefined
      if (!password) throw new Error('Password creation failed in test setup')

      await expect(hasher.hash(password)).rejects.toThrow('boom')
    })
  })

  describe('verify()', () => {
    it('delegates to argon2.verify with pepper as secret', async () => {
      lib.verify.mockResolvedValue(true)

      const ok = await hasher.verify('plain-pass', '$argon2id$hashvalue')

      expect(lib.verify).toHaveBeenCalledWith('$argon2id$hashvalue', 'plain-pass', {
        secret: Buffer.from(pepper),
      })
      expect(ok).toBe(true)
    })

    it('returns false when underlying verify returns false', async () => {
      lib.verify.mockResolvedValue(false)

      const ok = await hasher.verify('plain-pass', '$argon2id$hashvalue')

      expect(ok).toBe(false)
    })

    it('propagates errors from underlying verify', async () => {
      lib.verify.mockRejectedValue(new Error('verify-fail'))

      await expect(hasher.verify('plain', 'hash')).rejects.toThrow('verify-fail')
    })
  })
})
