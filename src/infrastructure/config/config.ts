import { join } from 'path'

import { cleanEnv, port, str, json, num } from 'envalid'

import type { ClientKey } from '@infrastructure/clients/types.js'

export type Config = typeof config

// We purposefully do NOT require redis/mongo/postgres variables up front; they are conditionally
// enforced based on CLIENT_TYPES below. This allows running with only the persistence backends
// that are actually enabled.
const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  BASE_URL: str({ default: 'localhost:3000' }),
  CLIENT_TYPES: json<ClientKey[]>({
    desc: 'What clients would be used. Determines if migrations need to run if supported',
  }),
  // Optional persistence vars (validated conditionally later)
  REDIS_HOST: str({ default: '' }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_USERNAME: str({ default: '' }),
  REDIS_PASSWORD: str({ default: '' }),
  MONGO_ENDPOINT: str({ default: '' }),
  MONGO_INITDB_ROOT_USERNAME: str({ default: '' }),
  MONGO_INITDB_ROOT_PASSWORD: str({ default: '' }),
  MONGO_DB: str({ default: 'url_shortener' }),
  NODE_ENV: str(),
  MIGRATIONS_PATH: str({ default: 'src/infrastructure/db/migrations' }),
  POSTGRES_PASSWORD: str({ default: '' }),
  POSTGRES_USER: str({ default: 'postgres' }),
  POSTGRES_DB: str({ default: '' }),
  POSTGRES_HOST: str({ default: '' }),
  PEPPER: str({ desc: '16-32 bytes for hashing passwords' }),
  SESSION_TTL: num({ desc: 'How long a session will be alive in days', default: 30 }),
  SESSION_SECRET_LENGTH: num({
    desc: 'How many bytes for generating session refresh token',
    default: 16,
  }),
  REFRESH_TOKEN_SECRET: str({ desc: '16 byte string used to hash refresh tokens' }),
  ACCESS_TOKEN_AUDIENCE: str({ default: 'urlShortenerAPI' }),
  ACCESS_TOKEN_ISSUER: str({ default: 'urlShortenerAPI' }),
  ACCESS_TOKEN_TTL: num({ desc: 'seconds token is active', default: 600 }),
  ACCESS_TOKEN_PRIVATE_KEY: str(),
  ACCESS_TOKEN_PUBLIC_KEY: str(),
  ACCESS_TOKEN_ALGO: str({ default: 'EdDSA' }),
})

const cfg = {
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
  postgresPassword: env.POSTGRES_PASSWORD,
  postgresUser: env.POSTGRES_USER,
  postgresDb: env.POSTGRES_DB,
  postgresHost: env.POSTGRES_HOST,
  pepper: env.PEPPER,
  sessionTtl: env.SESSION_TTL * 24 * 60 * 60, //days to seconds
  sessionSecretLength: env.SESSION_SECRET_LENGTH,
  refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
  accessTokenAudience: env.ACCESS_TOKEN_AUDIENCE,
  accessTokenIssuer: env.ACCESS_TOKEN_ISSUER,
  accessTokenTtl: env.ACCESS_TOKEN_TTL,
  accessTokenPrivateKey: env.ACCESS_TOKEN_PRIVATE_KEY,
  accessTokenPublicKey: env.ACCESS_TOKEN_PUBLIC_KEY,
  accessTokenAlgo: env.ACCESS_TOKEN_ALGO,
}

// Conditional validation for persistence backends.
/**
 * Asserts that an environment variable value is present (non-empty) when a given client is enabled.
 * @param {string} name Environment variable name
 * @param {unknown} value The resolved value to validate
 * @param {ClientKey} client Client key that triggered the requirement
 */
function assertPresent(name: string, value: unknown, client: ClientKey) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${name} is required when '${client}' client is enabled`)
  }
}

for (const key of cfg.clientTypes) {
  if (key === 'redis') {
    assertPresent('REDIS_HOST', cfg.redisHost, key)
    assertPresent('REDIS_PASSWORD', cfg.redisPassword, key)
  } else if (key === 'mongo') {
    assertPresent('MONGO_ENDPOINT', cfg.mongoEndpoint, key)
    assertPresent('MONGO_INITDB_ROOT_USERNAME', cfg.mongoUsername, key)
    assertPresent('MONGO_INITDB_ROOT_PASSWORD', cfg.mongoPassword, key)
  } else if (key === 'postgres') {
    assertPresent('POSTGRES_HOST', cfg.postgresHost, key)
    assertPresent('POSTGRES_DB', cfg.postgresDb, key)
    assertPresent('POSTGRES_PASSWORD', cfg.postgresPassword, key)
  }
}

export const config = cfg
