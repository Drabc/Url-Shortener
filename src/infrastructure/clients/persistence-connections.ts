// import { Redis, RedisOptions } from 'ioredis'
// import { Db, MongoClient } from 'mongodb'
import { Logger } from 'pino'
import { Pool } from 'pg'

import {
  ClientEntries,
  ClientKey,
  ClientEntryOf,
  ClientMap,
} from '@infrastructure/clients/types.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import { config } from '@infrastructure/config/config.js'
import {
  ClientInitializationError,
  UnsupportedClientKeyError,
  DuplicateClientRegistrationError,
  ClientDisconnectError,
} from '@infrastructure/errors/clients.error.js'

/**
 * PersistenceConnections holds initialized persistence clients (e.g., Mongo, Redis)
 * and provides a uniform way to access and disconnect them.
 * Construction is synchronous; use the factory to build the registry first.
 * @param {typeof config} cfg - Configuration object for client initialization.
 * @param {Logger} logger - Logger instance for logging connection status.
 * @param {ClientEntries} registry - Pre-initialized client entries.
 */
export class PersistenceConnections {
  public readonly clientKeys: ClientKey[]
  private readonly registry: ClientEntries

  public constructor(
    private readonly logger: Logger,
    registry: ClientEntries,
  ) {
    this.clientKeys = Object.keys(registry) as ClientKey[]
    this.registry = registry
  }

  /**
   * Retrieves a client by key
   * @param {ClientKey} key client key
   * @returns {ClientMap[K]} the client instance if present
   */
  public get<K extends ClientKey>(key: K): ClientMap[K] {
    if (!this.registry[key]?.client) {
      throw new UnsupportedClientKeyError(key)
    }
    return this.registry[key].client
  }

  /**
   * Disconnects all registered clients. Errors are swallowed to ensure best-effort shutdown.
   */
  public async disconnectAll(): Promise<void> {
    const tasks = Object.entries(this.registry).map(async ([key, entry]) => {
      try {
        await entry.disconnect()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        this.logger.error(
          { err: new ClientDisconnectError(key, msg), key },
          'Failed to disconnect client',
        )
      }
    })
    await Promise.all(tasks)
  }
}

/**
 * Factory: builds the client registry and returns a ready PersistenceConnections.
 * @param {typeof config} cfg configuration object
 * @param {Logger} logger logger instance
 * @returns {Promise<PersistenceConnections>} connected clients registry
 */
export async function createPersistenceConnections(
  cfg: typeof config,
  logger: Logger,
): Promise<PersistenceConnections> {
  const registry: ClientEntries = {}

  for (const key of cfg.clientTypes) {
    if (registry[key]) {
      throw new DuplicateClientRegistrationError(key)
    }
    // No need to abstract yet.
    try {
      if (key === 'mongo') {
        // registry[key] = await createMongoEntry(cfg, logger)
      } else if (key === 'redis') {
        // registry[key] = createRedisEntry(cfg, logger)
      } else if (key === 'postgres') {
        registry[key] = createPostgresEntry(cfg, logger)
      } else {
        throw new UnsupportedClientKeyError(key)
      }
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e)
      throw new ClientInitializationError(key, details)
    }
  }

  return new PersistenceConnections(logger, registry)
}

// Disabling for now
// /**
//  * Creates and connects to MongoDB client
//  * @param {typeof config} cfg configuration object
//  * @param {Logger} logger logger instance
//  * @returns {Promise<ClientEntryOf<Db>>} Connected MongoDB database entry
//  */
// async function createMongoEntry(
//   cfg: typeof config,
//   logger: Logger,
// ): Promise<ClientEntryOf<Db>> {
//   const conn = new MongoClient(cfg.mongoEndpoint, {
//     auth: {
//       username: cfg.mongoUsername,
//       password: cfg.mongoPassword,
//     },
//   })

//   logger.info('Connecting to MongoDB...')
//   await conn.connect()

//   const disconnect = async () => {
//     await conn.close()
//     logger.info('MongoDB Client disconnected')
//   }

//   return {
//     client: conn.db(cfg.mongoDb),
//     disconnect,
//   }
// }

// /**
//  * Creates and connects to Redis client
//  * @param {typeof config} cfg configuration object
//  * @param {Logger} logger logger instance
//  * @returns {ClientEntryOf<Redis>} Connected Redis client entry
//  */
// function createRedisEntry(
//   cfg: typeof config,
//   logger: Logger,
// ): ClientEntryOf<Redis> {
//   const redisOptions: RedisOptions = {
//     host: cfg.redisHost,
//     password: cfg.redisPassword,
//     username: cfg.redisUsername,
//   }

//   logger.info('Connecting to Redis...')
//   const client = new Redis(redisOptions)

//   const disconnect = async () => {
//     await client.quit()
//     logger.info('Redis client disconnected')
//   }

//   return {
//     client,
//     disconnect,
//   }
// }

/**
 * Creates and connects to Postgres client
 * @param {typeof config} cfg configuration object
 * @param {Logger} logger logger instance
 * @returns {ClientEntryOf<PgClient>} Connected Postgres client entry
 */
function createPostgresEntry(
  cfg: typeof config,
  logger: Logger,
): ClientEntryOf<PgClient> {
  logger.info('Connecting to Postgres...')
  const pool = new Pool({
    user: cfg.postgresUser,
    host: cfg.postgresHost,
    database: cfg.postgresDb,
    password: cfg.postgresPassword,
  })

  return {
    client: new PgClient(pool),
    disconnect: async () => {
      await pool.end()
      logger.info('Postgres client disconnected')
    },
  }
}
