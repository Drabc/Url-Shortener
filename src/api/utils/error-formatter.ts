export type JsonErrorFormat = {
  error: {
    type: string
    code: number
    message: string
    details?: {
      url?: string
      stack?: string[]
    }
  }
}

export const formatError = (
  type: string,
  code: number,
  message: string,
  details = {},
): JsonErrorFormat => {
  return {
    error: {
      type,
      code,
      message,
      ...details,
    },
  }
}
