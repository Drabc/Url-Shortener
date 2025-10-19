import { Email } from '@domain/value-objects/email.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('Email', () => {
  describe('create()', () => {
    it('returns Ok for a simple valid email', () => {
      const res = Email.create('user@example.com')
      expect(res.ok).toBe(true)
      const okRes = res as Success<typeof res>
      expect(okRes.value.value).toBe('user@example.com')
    })

    it('returns Ok for a valid email with plus and subdomain', () => {
      const value = 'user.name+tag@sub.example.co'
      const res = Email.create(value)
      expect(res.ok).toBe(true)
    })

    it('normalizes and trims surrounding whitespace', () => {
      const res = Email.create('  user@example.com  ')
      expect(res.ok).toBe(true)
      const okRes = res as Success<typeof res>
      expect(okRes.value.value).toBe('user@example.com')
    })

    it('returns Err for empty string', () => {
      const res = Email.create('')
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.type).toBe('InvalidEmail')
    })

    it('returns Err for clearly invalid format', () => {
      const res = Email.create('not-an-email')
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.type).toBe('InvalidEmail')
    })

    it('returns Err for missing domain part', () => {
      const res = Email.create('user@')
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.type).toBe('InvalidEmail')
    })
  })
})
