import { Redis, RedisOptions } from 'ioredis'

import { Config } from '@infrastructure/config/config.js'

export const createRedisRateLimitStore = (config: Config): Redis => {
  const redisOptions: RedisOptions = {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    username: config.redisUsername,
    db: config.isTest ? 15 : 1,
  }

  return new Redis(redisOptions)
}
