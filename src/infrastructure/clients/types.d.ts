import type { Db } from 'mongodb'
import type { Redis } from 'ioredis'
import type { Pool } from 'pg'

import {
  MONGO_CLIENT,
  REDIS_CLIENT,
  POSTGRES_CLIENT,
} from '@infrastructure/constants.ts'

export type MongoClientKey = typeof MONGO_CLIENT
export type RedisClientKey = typeof REDIS_CLIENT
export type PostgresClientKey = typeof POSTGRES_CLIENT

export type ClientKey = MongoClientKey | RedisClientKey | PostgresClientKey

export type ClientMap = {
  [MONGO_CLIENT]: Db
  [REDIS_CLIENT]: Redis
  [POSTGRES_CLIENT]: Pool
}

export type ClientValue = ClientMap[ClientKey]

export type ClientEntryOf<K extends ClientKey> = {
  client: ClientMap[K]
  disconnect: () => Promise<void>
}

export type ClientEntries = { [K in ClientKey]?: ClientEntryOf<K> }
