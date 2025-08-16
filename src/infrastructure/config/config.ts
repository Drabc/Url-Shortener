import { join } from 'path'

import { cleanEnv, port, str, json } from 'envalid'

import type { ClientKey } from '@infrastructure/clients/types.js'

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  BASE_URL: str({ default: 'localhost:3000' }),
  CLIENT_TYPES: json<ClientKey[]>({
    desc: 'What clients would be used. Determines if migrations need to run if supported',
  }),
  REDIS_HOST: str(),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_USERNAME: str(),
  REDIS_PASSWORD: str(),
  MONGO_ENDPOINT: str(),
  MONGO_INITDB_ROOT_USERNAME: str(),
  MONGO_INITDB_ROOT_PASSWORD: str(),
  MONGO_DB: str({ default: 'url_shortener' }),
  NODE_ENV: str(),
  MIGRATIONS_PATH: str({ default: 'src/infrastructure/db/migrations' }),
})

export const config = {
  port: env.PORT,
  baseUrl: env.BASE_URL,
  redisHost: env.REDIS_HOST,
  redisPort: env.REDIS_PORT,
  redisUsername: env.REDIS_USERNAME,
  redisPassword: env.REDIS_PASSWORD,
  mongoEndpoint: env.MONGO_ENDPOINT,
  mongoUsername: env.MONGO_INITDB_ROOT_USERNAME,
  mongoPassword: env.MONGO_INITDB_ROOT_PASSWORD,
  mongoDb: env.MONGO_DB,
  isDev: env.NODE_ENV === 'development',
  rootDir: process.cwd(), // Can be replaced by a more robust solution
  clientTypes: env.CLIENT_TYPES,
  migrationsPath: join(process.cwd(), env.MIGRATIONS_PATH),
}
