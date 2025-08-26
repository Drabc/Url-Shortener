import { IPasswordHasher } from '@domain/ports/password-hasher.port.js'
import { IUserRepository } from '@domain/repositories/user.repository.interface.js'
import { UserDTO } from '@application/use-cases/dtos.js'
import { User } from '@domain/entities/user.js'
import { Clock } from '@application/shared/clock.js'

/**
 * Use case responsible for registering a new user.
 * @param {IUserRepository} repo User repository implementation
 * @param {IPasswordHasher} hasher Password hasher implementation
 * @param {Clock} clock Simplifies now generation
 */
export class RegisterUser {
  constructor(
    private repo: IUserRepository,
    private hasher: IPasswordHasher,
    private clock: Clock,
  ) {}

  /**
   * Registers a new user: hashes the provided password, creates a User entity and persists it.
   * @param {UserDTO} data UserDTO with the new user's data
   */
  async exec(data: UserDTO): Promise<void> {
    const passwordHash = await this.hasher.hash(data.password)

    const user = new User(
      data.id,
      data.firstName,
      data.lastName,
      data.email,
      passwordHash,
      this.clock.now(),
    )

    await this.repo.save(user)
  }
}
