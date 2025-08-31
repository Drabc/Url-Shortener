import { Collection, Db, Document, FindCursor, WithId } from 'mongodb'

import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'
import { Migration } from '@infrastructure/db/migrations/types.js'
import {
  InvalidMigrationFilenameError,
  LatestMigrationFileNotFoundError,
} from '@infrastructure/errors/migration.error.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'

describe('MigrationPlanner', () => {
  let planner: MigrationPlanner
  let fsLike: { readdirSync: jest.Mock; readFileSync: jest.Mock }
  let importerLike: jest.Mock
  let client: jest.Mocked<Db>
  let collection: jest.Mocked<Collection>
  let cursor: jest.Mocked<FindCursor>
  let connections: jest.Mocked<PersistenceConnections>

  beforeEach(() => {
    // Fake directory entries
    const files = [
      { name: '0001-create-urls.ts', isFile: () => true },
      { name: '0002-add-index.ts', isFile: () => true },
    ]

    fsLike = {
      readdirSync: jest.fn().mockReturnValue(files),
      readFileSync: jest.fn(),
    }

    importerLike = jest.fn(async () => ({
      default: (_client: Db, id: string) =>
        ({
          id,
          up: jest.fn().mockResolvedValue(undefined),
        }) as unknown as Migration<Db>,
    }))

    cursor = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      next: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<FindCursor<WithId<Document>>>

    collection = jest.mocked({
      find: jest.fn().mockReturnValue(cursor),
    } as unknown as Collection)

    client = {
      collection: jest.fn().mockReturnValue(collection),
    } as unknown as jest.Mocked<Db>
    connections = {
      clientKeys: ['mongo'],
      get: jest.fn().mockReturnValue(client),
    } as unknown as jest.Mocked<PersistenceConnections>

    planner = new MigrationPlanner('/fake/path', fsLike, importerLike)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('plans()', () => {
    it('creates a MongoMigrationPlan when mongo client is active', async () => {
      const plans = await planner.plans(connections)

      // Should have read the directory and imported two files
      expect(fsLike.readdirSync).toHaveBeenCalledWith('/fake/path/mongo', {
        encoding: 'utf-8',
        withFileTypes: true,
      })
      expect(importerLike).toHaveBeenCalledTimes(2)
      expect(importerLike).toHaveBeenCalledWith(expect.stringContaining('0001-create-urls.ts'))
      expect(importerLike).toHaveBeenCalledWith(expect.stringContaining('0002-add-index.ts'))

      expect(plans).toHaveLength(1)
    })

    it('skips already applied migrations and only imports newer ones', async () => {
      cursor.next.mockResolvedValue({ _id: '0001-create-urls' })

      const plans = await planner.plans(connections)

      expect(fsLike.readdirSync).toHaveBeenCalledWith('/fake/path/mongo', {
        encoding: 'utf-8',
        withFileTypes: true,
      })
      // Only the migration after the latest should be imported
      expect(importerLike).toHaveBeenCalledTimes(1)
      expect(importerLike).toHaveBeenCalledWith(expect.stringContaining('0002-add-index.ts'))
      expect(importerLike).not.toHaveBeenCalledWith(expect.stringContaining('0001-create-urls.ts'))

      expect(plans).toHaveLength(1)
    })

    it('returns no plans when only unsupported clients are active', async () => {
      const connections = {
        clientKeys: ['redis'],
        get: jest.fn(),
      } as unknown as jest.Mocked<PersistenceConnections>

      const plans = await planner.plans(connections)

      expect(fsLike.readdirSync).not.toHaveBeenCalled()
      expect(importerLike).not.toHaveBeenCalled()
      expect(plans).toHaveLength(0)
    })

    it('throws InvalidMigrationFilenameError when an invalid filename is encountered', async () => {
      cursor.next.mockResolvedValue(null)
      // Provide an invalid filename (no numeric prefix + dash)
      fsLike.readdirSync.mockReturnValueOnce([
        { name: 'bad.ts', isFile: () => true },
        { name: '0002-add-index.ts', isFile: () => true },
      ])

      await expect(planner.plans(connections)).rejects.toBeInstanceOf(InvalidMigrationFilenameError)
      expect(importerLike).not.toHaveBeenCalled()
    })

    it('throws LatestMigrationFileNotFoundError when the latest applied migration is missing in files', async () => {
      cursor.next.mockResolvedValue({ _id: '0005-missing' })
      fsLike.readdirSync.mockReturnValueOnce([
        { name: '0001-create-urls.ts', isFile: () => true },
        { name: '0002-add-index.ts', isFile: () => true },
      ])

      await expect(planner.plans(connections)).rejects.toBeInstanceOf(
        LatestMigrationFileNotFoundError,
      )
      expect(importerLike).not.toHaveBeenCalled()
    })

    it('bubbles up importer errors when importing a migration module fails', async () => {
      cursor.next.mockResolvedValue(null)
      importerLike.mockRejectedValueOnce(new Error('import boom'))

      await expect(planner.plans(connections)).rejects.toThrow('import boom')
    })
  })
})
