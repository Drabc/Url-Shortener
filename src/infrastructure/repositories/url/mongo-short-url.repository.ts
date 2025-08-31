import { Collection, Db, Int32, MongoServerError, ObjectId } from 'mongodb'

import { ShortUrl } from '@domain/entities/short-url.js'
import { IUrlRepository } from '@domain/repositories/url-repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { CodeExistsError, ImmutableCodeError } from '@infrastructure/errors/repository.error.js'

export type MongoShortUrl = {
  _id?: ObjectId
  code: string
  originalUrl: string
  createdAt: Date
  updatedAt: Date
  schemaVersion: Int32
}

/**
 * Repository implementation for managing ShortUrl entities in MongoDB.
 * @param {Db} db the mongoDB handle
 */
export class MongoShortUrlRepository implements IUrlRepository {
  private collection: Collection<MongoShortUrl>
  private readonly version: Int32 = new Int32(1)

  constructor(db: Db) {
    this.collection = db.collection<MongoShortUrl>('urls')
  }

  /**
   * Finds a ShortUrl entity by its unique identifier.
   * @param {string} code - The unique code of the short URL.
   * @returns {Promise<ShortUrl | null>} The found ShortUrl entity or null if not found.
   */
  async findByCode(code: string): Promise<ShortUrl | null> {
    const result = await this.collection.findOne<MongoShortUrl>({
      code,
    })

    if (!result) {
      return null
    }

    return new ShortUrl(
      result._id ? result._id.toString() : '',
      result.code,
      new ValidUrl(result.originalUrl),
    )
  }

  /**
   * Saves a ShortUrl entity to the MongoDB collection.
   * @param {ShortUrl} entity - The ShortUrl entity to save.
   * @throws {CodeExistsError} if the short URL code already exists in the database.
   * @throws {ImmutableCodeError} if trying to update an existing ShortUrl (updates are not allowed).
   * @returns {Promise<void>}
   */
  async save(entity: ShortUrl): Promise<void> {
    if (entity.isPersisted()) {
      throw new ImmutableCodeError()
    }

    const code = {
      code: entity.code,
      originalUrl: entity.url,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: this.version,
    }
    try {
      await this.collection.insertOne(code)
    } catch (err) {
      const e = err as MongoServerError
      if (e.code === 11000) {
        throw new CodeExistsError(`MongoDb: Code ${code.code} already exists `)
      }

      throw err
    }
  }
}
