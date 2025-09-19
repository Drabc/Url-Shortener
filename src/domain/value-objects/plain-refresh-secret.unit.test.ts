import { PlainRefreshSecret } from '@domain/value-objects/plain-refresh-secret.js'

describe('PlainRefreshSecret', () => {
  describe('fromBytes()', () => {
    it('creates value object at minimum boundary', () => {
      const buf = Buffer.alloc(16, 1)
      const secret = PlainRefreshSecret.fromBytes(buf)
      expect(secret.value).toBe(buf)
      expect(secret.value.length).toBe(16)
    })

    it('creates value object at maximum boundary', () => {
      const buf = Buffer.alloc(32, 2)
      const secret = PlainRefreshSecret.fromBytes(buf)
      expect(secret.value.length).toBe(32)
    })

    it('throws when below minimum', () => {
      const buf = Buffer.alloc(15, 3)
      expect(() => PlainRefreshSecret.fromBytes(buf)).toThrow(
        'Refresh Secret must be between 16 and 32 bytes',
      )
    })

    it('throws when above maximum', () => {
      const buf = Buffer.alloc(33, 4)
      expect(() => PlainRefreshSecret.fromBytes(buf)).toThrow(
        'Refresh Secret must be between 16 and 32 bytes',
      )
    })

    it('allows mid-range length', () => {
      const buf = Buffer.alloc(24, 5)
      const secret = PlainRefreshSecret.fromBytes(buf)
      expect(secret.value.length).toBe(24)
    })
  })
})
