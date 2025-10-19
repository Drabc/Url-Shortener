import { Password } from '@domain/value-objects/password.js'

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('Password.create()', () => {
  it('returns Ok for a strong valid password', () => {
    const res = Password.create('Abcdef!1')
    expect(res.ok).toBe(true)
    const ok = res as Success<typeof res>
    expect(ok.value.value).toBe('Abcdef!1')
  })

  it('returns Ok for minimum length boundary (8 chars) when strong', () => {
    const res = Password.create('Abcdef!@')
    expect(res.ok).toBe(true)
    const ok = res as Success<typeof res>
    expect(ok.value.value).toBe('Abcdef!@')
  })

  it('returns Ok allowing trailing space (no trimming) if strength rules satisfied', () => {
    const res = Password.create('Abcdef! ')
    expect(res.ok).toBe(true)
    const ok = res as Success<typeof res>
    expect(ok.value.value).toBe('Abcdef! ')
  })

  it('returns Err when too short', () => {
    const res = Password.create('Abc!12')
    expect(res.ok).toBe(false)
    const err = res as Failure<typeof res>
    expect(err.error.kind).toBe('domain')
    expect(err.error.type).toBe('InvalidPassword')
    expect(err.error.message).toContain('short')
  })

  it('returns Err when too long ( > 1024 bytes )', () => {
    const over = 'A!' + 'a'.repeat(1023) // total length 1025 bytes
    const res = Password.create(over)
    expect(res.ok).toBe(false)
    const err = res as Failure<typeof res>
    expect(err.error.type).toBe('InvalidPassword')
    expect(err.error.message).toContain('long')
  })

  it('returns Err when missing uppercase', () => {
    const res = Password.create('abcdef!@')
    expect(res.ok).toBe(false)
    const err = res as Failure<typeof res>
    expect(err.error.type).toBe('InvalidPassword')
    expect(err.error.message).toContain('weak')
  })

  it('returns Err when missing symbol', () => {
    const res = Password.create('Abcdefgh')
    expect(res.ok).toBe(false)
    const err = res as Failure<typeof res>
    expect(err.error.type).toBe('InvalidPassword')
    expect(err.error.message).toContain('weak')
  })
})
