import { Password } from '@domain/value-objects/password.js'

describe('Password', () => {
  it('creates value object for a strong valid password', () => {
    const pw = Password.create('Abcdef!1')
    expect(pw.value).toBe('Abcdef!1')
  })

  it('accepts minimum length boundary (8 chars) when strong', () => {
    const pw = Password.create('Abcdef!@')
    expect(pw.value).toBe('Abcdef!@')
  })

  it('allows trailing space (no trimming) if strength rules still satisfied', () => {
    const pw = Password.create('Abcdef! ')
    expect(pw.value).toBe('Abcdef! ')
  })

  it('throws when too short', () => {
    expect(() => Password.create('Abc!12')).toThrow('Password is too short')
  })

  it('throws when too long ( > 1024 bytes )', () => {
    const over = 'A!' + 'a'.repeat(1023) // total length 1025 bytes
    expect(() => Password.create(over)).toThrow('Password too long')
  })

  it('throws when missing uppercase', () => {
    expect(() => Password.create('abcdef!@')).toThrow('Password is too weak')
  })

  it('throws when missing symbol', () => {
    expect(() => Password.create('Abcdefgh')).toThrow('Password is too weak')
  })
})
