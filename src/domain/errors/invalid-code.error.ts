export class InvalidCodeError extends Error {
  constructor(message: string = 'Invalid Code') {
    super(message)
  }
}
