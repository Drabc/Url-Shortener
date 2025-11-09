import { Password } from '@domain/value-objects/password.js'

export interface IPasswordHasher {
  hash(password: Password): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
}
