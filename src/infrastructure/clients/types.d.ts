import type { Db } from 'mongodb'
import type { Redis } from 'ioredis'

import {
  MONGO_CLIENT,
  REDIS_CLIENT,
  POSTGRES_CLIENT,
} from '@infrastructure/constants.ts'
import { PgClient } from '@infrastructure/clients/pg-client.ts'

export type ClientKey =
  | typeof MONGO_CLIENT
  | typeof REDIS_CLIENT
  | typeof POSTGRES_CLIENT

export type ClientMap = {
  [MONGO_CLIENT]: Db
  [REDIS_CLIENT]: Redis
  [POSTGRES_CLIENT]: PgClient
}

export type ClientValue = ClientMap[ClientKey]

export type ClientEntryOf<K extends ClientValue> = {
  client: K
  disconnect: () => Promise<void>
}

export type ClientEntries = { [K in ClientKey]?: ClientEntryOf<ClientMap[K]> }
