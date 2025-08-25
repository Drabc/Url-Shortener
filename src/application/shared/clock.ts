export type Clock = { now(): Date }
export const clock: Clock = { now: () => new Date() }
