import { Redis, RedisOptions } from 'ioredis'
import { Db, MongoClient } from 'mongodb'
import { Logger } from 'pino'
import { Pool } from 'pg'

import {
  ClientEntries,
  ClientKey,
  ClientEntryOf,
  ClientMap,
} from '@infrastructure/clients/types.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import type { Config } from '@infrastructure/config/config.js'
import {
  ClientInitializationError,
  UnsupportedClientKeyError,
  DuplicateClientRegistrationError,
  ClientDisconnectError,
} from '@infrastructure/errors/clients.error.js'
import { createRedisRateLimitStore } from '@infrastructure/clients/redis-rate-limit-store.js'

type clientOverwrites = {
  pg: (pool: Pool) => PgClient
}

/**
 * PersistenceConnections holds initialized persistence clients (e.g., Mongo, Redis)
 * and provides a uniform way to access and disconnect them.
 * Construction is synchronous; use the factory to build the registry first.
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
 * @param {Config} cfg configuration object
 * @param {Logger} logger logger instance
 * @param {clientOverwrites} overwrites Optional overwrites to replace clients
 * @returns {Promise<PersistenceConnections>} connected clients registry
 */
export async function createPersistenceConnections(
  cfg: Config,
  logger: Logger,
  overwrites?: clientOverwrites,
): Promise<PersistenceConnections> {
  const registry: ClientEntries = {}

  for (const key of cfg.clientTypes) {
    if (registry[key]) {
      throw new DuplicateClientRegistrationError(key)
    }
    // No need to abstract yet.
    try {
      if (key === 'mongo') {
        registry[key] = await createMongoEntry(cfg, logger)
      } else if (key === 'redis') {
        registry[key] = createRedisEntry(cfg, logger)
      } else if (key === 'postgres') {
        registry[key] = createPostgresEntry(cfg, logger, overwrites)
      } else {
        throw new UnsupportedClientKeyError(key)
      }
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e)
      throw new ClientInitializationError(key, details)
    }
  }

  try {
    // Default Clients
    registry['rate_limit'] = createRateLimitClient(cfg, logger)
  } catch (e) {
    const details = e instanceof Error ? e.message : String(e)
    throw new ClientInitializationError('rate_limit', details)
  }

  return new PersistenceConnections(logger, registry)
}

/**
 * Creates and connects to MongoDB client
 * @param {Config} cfg configuration object
 * @param {Logger} logger logger instance
 * @returns {Promise<ClientEntryOf<Db>>} Connected MongoDB database entry
 */
async function createMongoEntry(cfg: Config, logger: Logger): Promise<ClientEntryOf<Db>> {
  const conn = new MongoClient(cfg.mongoEndpoint, {
    auth: {
      username: cfg.mongoUsername,
      password: cfg.mongoPassword,
    },
  })

  logger.info('Connecting to MongoDB...')
  await conn.connect()

  const disconnect = async () => {
    await conn.close()
    logger.info('MongoDB Client disconnected')
  }

  return {
    client: conn.db(cfg.mongoDb),
    disconnect,
  }
}

/**
 * Creates and connects to Redis client
 * @param {Config} cfg configuration object
 * @param {Logger} logger logger instance
 * @returns {ClientEntryOf<Redis>} Connected Redis client entry
 */
function createRedisEntry(cfg: Config, logger: Logger): ClientEntryOf<Redis> {
  const redisOptions: RedisOptions = {
    host: cfg.redisHost,
    port: cfg.redisPort,
    password: cfg.redisPassword,
    username: cfg.redisUsername,
    db: cfg.isTest ? 14 : 0, // Use separate DB for tests
  }

  logger.info('Connecting to Redis...')
  const client = new Redis(redisOptions)

  const disconnect = async () => {
    await client.quit()
    logger.info('Redis client disconnected')
  }

  return {
    client,
    disconnect,
  }
}

/**
 * Creates and returns the dedicated Redis client used for rate limiting operations.
 * @param {Config} cfg configuration object
 * @param {Logger} logger logger instance
 * @returns {ClientEntryOf<Redis>} Connected rate limit Redis client entry
 */
function createRateLimitClient(cfg: Config, logger: Logger): ClientEntryOf<Redis> {
  logger.info('Creating Rate Limit Connection')
  const client = createRedisRateLimitStore(cfg)
  const disconnect = async () => {
    await client.quit()
    logger.info('Rate Limit Redis client disconnected')
  }

  return {
    client,
    disconnect,
  }
}

/**
 * Creates and connects to Postgres client
 * @param {Config} cfg configuration object
 * @param {Logger} logger logger instance
 * @param {clientOverwrites} overwrites Optional overwrites to replace clients
 * @returns {ClientEntryOf<PgClient>} Connected Postgres client entry
 */
function createPostgresEntry(
  cfg: Config,
  logger: Logger,
  overwrites?: clientOverwrites,
): ClientEntryOf<PgClient> {
  logger.info(`Connecting to Postgres ${cfg.postgresDb}...`)
  const pool = new Pool({
    user: cfg.postgresUser,
    host: cfg.postgresHost,
    database: cfg.postgresDb,
    password: cfg.postgresPassword,
  })

  return {
    client: overwrites?.pg ? overwrites.pg(pool) : new PgClient(pool),
    disconnect: async () => {
      await pool.end()
      logger.info('Postgres client disconnected')
    },
  }
}
