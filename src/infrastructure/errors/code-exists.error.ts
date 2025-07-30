export class CodeExistsError extends Error {
  constructor(code: string) {
    super(`Short URL code "${code}" already exists.`)
  }
}
