export type Digest = {
  readonly value: string
  readonly algo: string
}

export interface ITokenDigester {
  digest(plain: string): Digest
  verify(plain: string, hash: Digest): boolean
}
