import { Collection, Db, Int32, MongoServerError, ObjectId } from 'mongodb'

import { ShortUrl } from '@domain/entities/short-url.js'
import { IShortUrlRepository } from '@domain/repositories/short-url.repository.interface.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { AsyncResult, Err, Ok } from '@shared/result.js'
import { errorFactory } from '@shared/errors.js'
import { CodeError } from '@domain/errors/repository.error.js'

export type MongoShortUrl = {
  _id?: ObjectId
  code: string
  originalUrl: string
  userId?: string
  createdAt: Date
  updatedAt: Date
  schemaVersion: Int32
}

/**
 * Repository implementation for managing ShortUrl entities in MongoDB.
 * @param {Db} db the mongoDB handle
 */
export class MongoShortUrlRepository implements IShortUrlRepository {
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
      result._id!.toString(),
      result.code,
      new ValidUrl(result.originalUrl),
      result.userId,
      false,
    )
  }

  /**
   * Saves a new ShortUrl entity to the MongoDB collection.
   * or Err(UnableToSave) for other persistence failures.
   * @param {ShortUrl} entity the domain short url
   * @returns {AsyncResult<void, CodeError>} Returns Err(ImmutableCode) if entity is not new, Err(DuplicateCode) if code already exists
   */
  async save(entity: ShortUrl): AsyncResult<void, CodeError> {
    if (!entity.isNew()) {
      return Err(errorFactory.domain('ImmutableCode'))
    }

    const code = {
      code: entity.code,
      originalUrl: entity.url,
      userId: entity.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: this.version,
    }

    try {
      await this.collection.insertOne(code)
      return Ok(undefined)
    } catch (err) {
      const e = err as MongoServerError
      if (e.code === 11000) {
        return Err(errorFactory.domain('DuplicateCode'))
      }
      return Err(errorFactory.domain('UnableToSave'))
    }
  }
}
