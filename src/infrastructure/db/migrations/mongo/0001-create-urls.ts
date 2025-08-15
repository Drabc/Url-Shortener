import { Db } from 'mongodb'

import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Migration to create the 'urls' collection in MongoDB.
 * This collection will store short URLs with their original URLs and metadata.
 * @param db - The MongoDB database context.
 * @param id - The migration ID.
 * @returns A new migration instance.
 */
class CreateUrlsMigration extends Migration<Db> {
  constructor(
    private readonly db: Db,
    public readonly id: string,
  ) {
    super(db, id)
  }

  /**
   * Creates the 'urls' collection with a schema, validation, and an index on the 'code' field.
   * @returns {Promise<void>}
   */
  async up(): Promise<void> {
    await this.db.createCollection('urls', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'code',
            'originalUrl',
            'createdAt',
            'updatedAt',
            'schemaVersion',
          ],
          properties: {
            code: {
              bsonType: 'string',
              description: 'Short URL code (unique)',
            },
            originalUrl: {
              bsonType: 'string',
              description: 'Full target URL',
            },
            createAt: {
              bsonType: 'date',
              description: 'When this document was created',
            },
            updatedAt: {
              bsonType: 'date',
              description: 'When this document was last updated',
            },
            schemaVersion: {
              enum: [1],
              description: 'schema version marker',
            },
          },
        },
      },
    })
    await this.db.collection('urls').createIndex({ code: 1 }, { unique: true })
  }
}

/**
 * Factory function to create a new instance of CreateUrlsMigration.
 * @param {Db} db - The MongoDB database context.
 * @param {string} id - The migration ID.
 * @returns {Migration<Db>} A new CreateUrlsMigration instance.
 */
export default function createUrlMigration(db: Db, id: string): Migration<Db> {
  return new CreateUrlsMigration(db, id)
}
