export class InvalidUrlError extends Error {
  constructor(reason: string = 'Unexpected Format') {
    super(`Invalid Url: ${reason}`)
  }
}
