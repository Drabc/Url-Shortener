import { RegisterUser } from '@application/use-cases/register-user.use-case.js'
import { UserDTO } from '@application/use-cases/dtos.js'
import { User } from '@domain/entities/user.js'
import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { IPasswordHasher } from '@domain/ports/password-hasher.port.js'

describe('RegisterUser Use Case', () => {
  let repo: { save: jest.Mock }
  let hasher: { hash: jest.Mock }
  let clock: { now: jest.Mock }
  let useCase: RegisterUser

  beforeEach(() => {
    repo = { save: jest.fn() }
    hasher = { hash: jest.fn() }
    clock = { now: jest.fn() }
    useCase = new RegisterUser(
      repo as unknown as IUserRepository,
      hasher as unknown as IPasswordHasher,
      clock,
    )
  })

  const dto: UserDTO = {
    id: 'user-1',
    firstName: 'First',
    lastName: 'Last',
    email: 'user@example.com',
    password: 'P@ssword1',
  }

  it('hashes password, creates user and saves it', async () => {
    hasher.hash.mockResolvedValue('hashed')
    const now = new Date('2025-01-01T00:00:00.000Z')
    clock.now.mockReturnValue(now)

    await expect(useCase.exec(dto)).resolves.toBeUndefined()

    expect(hasher.hash).toHaveBeenCalledWith('P@ssword1')
    expect(repo.save).toHaveBeenCalledTimes(1)
    const savedUser = repo.save.mock.calls[0][0] as User
    expect(savedUser).toBeInstanceOf(User)
    expect(savedUser.id).toBe('user-1')
    expect(savedUser.firstName).toBe('First')
    expect(savedUser.lastName).toBe('Last')
    expect(savedUser.email.value).toBe('user@example.com')
    expect(savedUser.passwordHash).toBe('hashed')
    expect(savedUser.passwordUpdatedAt).toBe(now)
  })

  it('bubbles up repository errors', async () => {
    hasher.hash.mockResolvedValue('hashed')
    clock.now.mockReturnValue(new Date())
    const err = new Error('db fail')
    repo.save.mockRejectedValue(err)

    await expect(useCase.exec(dto)).rejects.toBe(err)
  })

  it('bubbles up hashing errors', async () => {
    hasher.hash.mockRejectedValue(new Error('hash fail'))

    await expect(useCase.exec(dto)).rejects.toThrow('hash fail')
    expect(repo.save).not.toHaveBeenCalled()
  })
})
