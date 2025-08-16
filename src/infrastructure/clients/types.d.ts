import type { Db } from 'mongodb'
import type { Redis } from 'ioredis'

import { MONGO_CLIENT, REDIS_CLIENT } from '@infrastructure/constants.ts'

export type MongoClientKey = typeof MONGO_CLIENT
export type RedisClientKey = typeof REDIS_CLIENT

export type ClientKey = MongoClientKey | RedisClientKey

export type ClientMap = {
  [MONGO_CLIENT]: Db
  [REDIS_CLIENT]: Redis
}

export type ClientValue = ClientMap[ClientKey]

export type ClientEntryOf<K extends ClientKey> = {
  client: ClientMap[K]
  disconnect: () => Promise<void>
}

export type ClientEntries = { [K in ClientKey]?: ClientEntryOf<K> }
