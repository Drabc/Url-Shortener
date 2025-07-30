export class CodeExistsError extends Error {
  constructor(shortCode: string) {
    super(`Short URL code "${shortCode}" already exists.`)
  }
}
