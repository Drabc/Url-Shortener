import { InvalidEmailError } from '@domain/errors/invalid-email.error.js'
import { Email } from '@domain/value-objects/email.js'

describe('Email', () => {
  describe('create()', () => {
    it('creates value object for a simple valid email', () => {
      const email = Email.create('user@example.com')
      expect(email.value).toBe('user@example.com')
    })

    it('creates value object for a valid email with plus and subdomain', () => {
      const value = 'user.name+tag@sub.example.co'
      expect(() => Email.create(value)).not.toThrow()
    })

    it('trims surrounding whitespace', () => {
      const email = Email.create('  user@example.com  ')
      expect(email.value).toBe('user@example.com')
    })

    it('throws for empty string', () => {
      expect(() => Email.create('')).toThrow(InvalidEmailError)
    })

    it('throws for clearly invalid format', () => {
      expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError)
    })

    it('throws for missing domain part', () => {
      expect(() => Email.create('user@')).toThrow(InvalidEmailError)
    })
  })
})
