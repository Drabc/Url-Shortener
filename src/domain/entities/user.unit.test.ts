import { User } from '@domain/entities/user.js'
import { Email } from '@domain/value-objects/email.js'
// Result-based error typing imported implicitly via factory usage

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

/**
 * Helper to create a User with sensible defaults overridden as needed for tests.
 * @param {Partial<{firstName:string; lastName:string; email:string; passwordHash:string; passwordUpdatedAt:Date}>} overrides Optional subset of properties to override defaults.
 * @returns {User} A new User entity instance.
 */
function makeUser(
  overrides: Partial<{
    firstName: string
    lastName: string
    email: string
    passwordHash: string
    passwordUpdatedAt: Date
  }> = {},
) {
  const res = User.create(
    'user-1',
    overrides.firstName ?? 'First',
    overrides.lastName ?? 'Last',
    overrides.email ?? 'user@example.com',
    overrides.passwordHash ?? 'hash1',
    overrides.passwordUpdatedAt ?? new Date('2025-01-01T00:00:00.000Z'),
  )
  // Success/Failure narrowing (avoid throwing)
  return (res as Success<typeof res>).value
}

describe('User Entity', () => {
  it('exposes initial properties', () => {
    const user = makeUser()
    expect(user.firstName).toBe('First')
    expect(user.lastName).toBe('Last')
    expect(user.email.value).toBe('user@example.com')
    expect(user.passwordHash).toBe('hash1')
    expect(user.passwordUpdatedAt.toISOString()).toBe('2025-01-01T00:00:00.000Z')
  })

  it('updates first name with non-empty value', () => {
    const user = makeUser()
    const res = user.updateFirstName('NewFirst')
    expect(res.ok).toBe(true)
    void (res as Success<typeof res>)
    expect(user.firstName).toBe('NewFirst')
  })

  it('returns Err on empty first name', () => {
    const user = makeUser()
    const res = user.updateFirstName('')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidValue')
  })

  it('updates last name with non-empty value', () => {
    const user = makeUser()
    const res = user.updateLastName('NewLast')
    expect(res.ok).toBe(true)
    expect(user.lastName).toBe('NewLast')
  })

  it('returns Err on empty last name', () => {
    const user = makeUser()
    const res = user.updateLastName('')
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidValue')
  })

  it('updates email using raw string', () => {
    const user = makeUser()
    const res = user.updateEmail('other@example.com')
    expect(res.ok).toBe(true)
    expect(user.email.value).toBe('other@example.com')
  })

  it('accepts Email value object directly', () => {
    const user = makeUser()
    const vo = { value: 'direct@example.com' } as unknown as Email
    const res = user.updateEmail(vo)
    expect(res.ok).toBe(true)
    expect(user.email).toBe(vo)
  })

  it('changePasswordHash updates hash and timestamp when later date provided', () => {
    const user = makeUser()
    const later = new Date('2025-02-01T00:00:00.000Z')
    const res = user.changePasswordHash('hash2', later)
    expect(res.ok).toBe(true)
    expect(user.passwordHash).toBe('hash2')
    expect(user.passwordUpdatedAt).toEqual(later)
  })

  it('changePasswordHash returns Err(InvalidPasswordTime) when timestamp not later', () => {
    const user = makeUser()
    const same = new Date('2025-01-01T00:00:00.000Z')
    const res = user.changePasswordHash('hash2', same)
    expect(res.ok).toBe(false)
    const failure = res as Failure<typeof res>
    expect(failure.error.type).toBe('InvalidPasswordTime')
  })
})
