import { InvalidUrlError } from '../errors/invalid-url.error.js'

export class ValidUrl {
  constructor(public readonly value: string) {
    if (!value) throw new InvalidUrlError('Must Not Be Empty')

    if (!value.startsWith('http')) {
      throw new InvalidUrlError('Must Start With http or https')
    }

    try {
      new URL(value)
    } catch {
      throw new InvalidUrlError()
    }
  }
}
