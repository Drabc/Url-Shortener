export type UserDTO = {
  id: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export type FingerPrint = {
  readonly clientId: string
  readonly ip: string
  readonly rawUa: string
}
