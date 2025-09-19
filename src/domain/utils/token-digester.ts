export type Digest = {
  readonly value: Buffer
  readonly algo: string
}

export interface ITokenDigester {
  digest(plain: Buffer): Digest
  verify(plain: Buffer, hash: Digest): boolean
}
