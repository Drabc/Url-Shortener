import type { Db } from 'mongodb'
import type { Redis } from 'ioredis'
import { Logger } from 'pino'

import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'
import type { ClientEntries } from '@infrastructure/clients/types.js'
import {
  ClientDisconnectError,
  UnsupportedClientKeyError,
} from '@infrastructure/errors/clients.error.js'
// no config needed for these tests

describe('PersistenceConnections', () => {
  let logger: Logger

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger
  })

  describe('get()', () => {
    it('returns the registered clients for their keys', () => {
      const mongoClient = { __tag: 'mongo' } as unknown as Db
      const redisClient = { __tag: 'redis' } as unknown as Redis

      const registry: ClientEntries = {
        mongo: {
          client: mongoClient,
          disconnect: async () => undefined,
        },
        redis: {
          client: redisClient,
          disconnect: async () => undefined,
        },
      }

      const pc = new PersistenceConnections(logger, registry)

      expect(pc.get('mongo')).toBe(mongoClient)
      expect(pc.get('redis')).toBe(redisClient)
    })

    it('throws UnsupportedClientKeyError when a key is missing from registry', () => {
      const registry: ClientEntries = {}

      const pc = new PersistenceConnections(logger, registry)

      expect(() => pc.get('mongo')).toThrow(UnsupportedClientKeyError)
    })
  })

  describe('disconnectAll()', () => {
    it('disconnects all clients and logs errors without throwing', async () => {
      const mongoDisconnect = jest.fn().mockResolvedValue(undefined)
      const redisDisconnectError = new Error('boom')
      const redisDisconnect = jest.fn().mockRejectedValue(redisDisconnectError)

      const registry: ClientEntries = {
        mongo: {
          client: {} as unknown as Db,
          disconnect: mongoDisconnect,
        },
        redis: {
          client: {} as unknown as Redis,
          disconnect: redisDisconnect,
        },
      }

      const pc = new PersistenceConnections(logger, registry)

      await expect(pc.disconnectAll()).resolves.toBeUndefined()

      expect(mongoDisconnect).toHaveBeenCalledTimes(1)
      expect(redisDisconnect).toHaveBeenCalledTimes(1)

      // Ensure an error was logged for the redis disconnect failure
      expect(logger.error).toHaveBeenCalled()
      const [firstArg, message] = (logger.error as jest.Mock).mock.calls[0]
      expect(message).toBe('Failed to disconnect client')
      expect(firstArg).toHaveProperty('key', 'redis')
      expect(firstArg).toHaveProperty('err')
      expect(firstArg.err).toBeInstanceOf(ClientDisconnectError)
    })
  })
})
