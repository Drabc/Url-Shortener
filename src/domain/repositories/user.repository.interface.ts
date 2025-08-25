import { User } from '@domain/entities/user.js'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}
