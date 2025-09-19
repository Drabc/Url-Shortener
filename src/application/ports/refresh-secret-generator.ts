import { PlainRefreshSecret } from '@domain/value-objects/plain-refresh-secret.js'

export interface IRefreshSecretGenerator {
  generate(length: number): PlainRefreshSecret
}
