import { cleanEnv, port, str } from 'envalid'

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  BASE_URL: str({ default: 'localhost:3000' }),
  REDIS_HOST: str(),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_USERNAME: str(),
  REDIS_PASSWORD: str(),
  NODE_ENV: str(),
})

export const config = {
  port: env.PORT,
  baseUrl: env.BASE_URL,
  redisHost: env.REDIS_HOST,
  redisPort: env.REDIS_PORT,
  redisUsername: env.REDIS_USERNAME,
  redisPassword: env.REDIS_PASSWORD,
  isDev: env.NODE_ENV === 'development',
}
