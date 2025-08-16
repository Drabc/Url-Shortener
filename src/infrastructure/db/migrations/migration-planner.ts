import { readFileSync, readdirSync, Dirent } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

import { Db } from 'mongodb'

import {
  Migration,
  MigrationPlan,
} from '@infrastructure/db/migrations/types.js'
import { MongoMigrationPlan } from '@infrastructure/db/migrations/plans/mongo-migration-plan.js'
import {
  InvalidMigrationFilenameError,
  LatestMigrationFileNotFoundError,
} from '@infrastructure/errors/migration.error.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'
import { MongoClientKey } from '@infrastructure/clients/types.js'
import { MONGO_CLIENT } from '@infrastructure/constants.js'

// OK to use sync as this happens before server starts listening
type FsLike = {
  readFileSync: typeof readFileSync
  readdirSync: typeof readdirSync
}

const SUPPORTED_TYPES = ['mongo']
type SupportedType = (typeof SUPPORTED_TYPES)[number]

/**
 * MigrationPlanner is responsible for planning migrations based on the active clients and the
 * available migration files in the specified path.
 * It reads the migration files, imports them, and creates migration plans
 * for each active supported database type.
 */
export class MigrationPlanner {
  constructor(
    private readonly migrationPath: string,
    private readonly fs: FsLike = { readdirSync, readFileSync },
  ) {}

  /**
   * Plans migrations for the active clients based on the migration files
   * available in the specified migration path.
   * @param {PersistenceConnections} connections - A registry of active clients, which may include
   * various database types.
   * @returns {Promise<MigrationPlan<Db>[]>} A promise that resolves to an array of migration plans.
   * Each plan corresponds to a supported database type with available migrations.
   * @todo
   * This method currently only supports MongoDB migrations. Future implementations
   * should extend this to support other database types as needed.
   * Use a modified version of clientRegistry that is specifically the
   * Supported db types
   */
  async plans(
    connections: PersistenceConnections,
  ): Promise<MigrationPlan<Db>[]> {
    const activeClientKeys = connections.clientKeys.filter((clientKey) =>
      SUPPORTED_TYPES.includes(clientKey),
    )

    const plans = await Promise.all(
      // Don't spect this to get bigger, but abstract if it does
      activeClientKeys.map(async (supportedClientKey: SupportedType) => {
        if (supportedClientKey == MONGO_CLIENT) {
          const client = connections.get<MongoClientKey>(supportedClientKey)
          return new MongoMigrationPlan(
            await this.getMigrations<Db>(supportedClientKey, client),
            client,
          )
        }
      }),
    )

    return plans.filter((plan) => !!plan)
  }

  /* eslint-disable jsdoc/no-undefined-types */
  /**
   * Retrieves migration files for a specific database client type.
   * It reads the migration directory for the given client type,
   * imports the migration files, and returns them as an array of Migration objects.
   * @param {SupportedType} clientType - The type of database client (e.g., 'mongo').
   * @param {keyof Clients} client - The client instance from the client registry.
   * @returns {Promise<Migration<T>[]>} A promise that resolves to an array of Migration objects
   * for the specified client type.
   */
  private async getMigrations<T extends Db>(
    clientType: SupportedType,
    client: T,
  ): Promise<Migration<T>[]> {
    const latestMigration = await this.findLastestMongoMigration(client)
    const clientMigrationPath = join(this.migrationPath, clientType)
    const files = this.fs
      .readdirSync(clientMigrationPath, {
        encoding: 'utf-8',
        withFileTypes: true,
      })
      .filter((f) => f.isFile() && f.name.endsWith('.ts'))
      .sort((a, b) => a.name.localeCompare(b.name))

    let startIndex = 0

    if (latestMigration) {
      const latestMigrationFileName = `${latestMigration}.ts`
      const foundIndex = this.binarySearchMigrationIndex(
        files,
        latestMigrationFileName,
      )
      if (foundIndex === -1) {
        throw new LatestMigrationFileNotFoundError(
          latestMigrationFileName,
          clientMigrationPath,
        )
      }
      startIndex = foundIndex + 1
    }

    const migrationsToRun = files.slice(startIndex)

    return Promise.all(
      migrationsToRun.map(async (fileName) => {
        const migrationModule = await import(
          pathToFileURL(join(clientMigrationPath, fileName.name)).href
        )
        const migrationId = fileName.name.replace('.ts', '')
        return migrationModule.default(client, migrationId) as Migration<T>
      }),
    )
  }

  /**
   * Finds the latest applied migration in the MongoDB 'migrations' collection.
   * @param {Db} db - The MongoDB database instance.
   * @returns {Promise<string | null>} The migration ID of the latest migration, or null if none found.
   * @todo create a small DOA to abstract migration fetching
   */
  private async findLastestMongoMigration(db: Db): Promise<string | null> {
    const migrationsCollection = db.collection('migrations')
    const latestMigration = await migrationsCollection
      .find()
      .sort({ appliedAt: -1 })
      .limit(1)
      .next()
    return latestMigration ? latestMigration._id.toString() : null
  }

  /**
   * Performs binary search to find the index of a migration file in the sorted array.
   * @param {Dirent[]} sortedFiles - Array of file entries sorted by name.
   * @param {string} targetMigrationId - The migration file name to find.
   * @returns {number} The index of the target file, or -1 if not found.
   */
  private binarySearchMigrationIndex(
    sortedFiles: Dirent[],
    targetMigrationId: string,
  ): number {
    const convertFileNameToInt = (fileName: string): number => {
      const match = fileName.match(/^(\d+)-/)

      if (match === null) {
        throw new InvalidMigrationFilenameError(fileName)
      }

      return parseInt(match[1], 10)
    }
    const targetMatch = convertFileNameToInt(targetMigrationId)
    let left = 0
    let right = sortedFiles.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midInt = convertFileNameToInt(sortedFiles[mid].name)

      if (midInt === targetMatch) {
        return mid
      } else if (midInt < targetMatch) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return -1 // Not found
  }
}
