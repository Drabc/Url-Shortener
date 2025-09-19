import { RefreshSecretGenerator } from '@infrastructure/auth/refresh-secret-generator.js'
import { PlainRefreshSecret } from '@domain/value-objects/plain-refresh-secret.js'

describe('RefreshSecretGenerator', () => {
  it('generates a PlainRefreshSecret of requested length', () => {
    const length = 20
    const genFn = jest.fn().mockReturnValue(Buffer.alloc(length))
    const gen = new RefreshSecretGenerator(genFn)
    const secret = gen.generate(length)
    expect(secret).toBeInstanceOf(PlainRefreshSecret)
    expect(secret.value.length).toBe(length)
    expect(genFn).toHaveBeenCalledWith(length)
  })
})
