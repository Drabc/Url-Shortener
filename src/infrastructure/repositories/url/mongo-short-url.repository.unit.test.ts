import { Collection, Db, Int32, MongoServerError, ObjectId } from 'mongodb'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { CodeExistsError, ImmutableCodeError } from '@infrastructure/errors/repository.error.js'
import {
  MongoShortUrlRepository,
  MongoShortUrl,
} from '@infrastructure/repositories/url/mongo-short-url.repository.js'

describe('MongoShortUrlRepository', () => {
  let db: jest.Mocked<Db>
  let collection: jest.Mocked<Collection<MongoShortUrl>>
  let repo: MongoShortUrlRepository

  beforeEach(() => {
    collection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
    } as unknown as jest.Mocked<Collection<MongoShortUrl>>

    db = {
      collection: jest.fn().mockReturnValue(collection),
    } as unknown as jest.Mocked<Db>

    repo = new MongoShortUrlRepository(db)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('findById()', () => {
    it('returns a ShortUrl when a document is found', async () => {
      const doc: MongoShortUrl = {
        _id: new ObjectId('66a6f8a0c0d5f0a1a1a1a1a1'),
        code: 'abc123',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: new Int32(1),
      }
      collection.findOne.mockResolvedValue(doc)

      const result = await repo.findByCode('abc123')

      expect(collection.findOne).toHaveBeenCalledWith({ code: 'abc123' })
      expect(result).toBeInstanceOf(ShortUrl)
      expect(result?.code).toBe('abc123')
      expect(result?.url).toBe('https://example.com')
    })

    it('returns null when no document is found', async () => {
      collection.findOne.mockResolvedValue(null)

      const result = await repo.findByCode('missing')

      expect(collection.findOne).toHaveBeenCalledWith({ code: 'missing' })
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('inserts a new ShortUrl document when not persisted', async () => {
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: new ObjectId(),
      })

      await repo.save(entity)

      expect(collection.insertOne).toHaveBeenCalledTimes(1)
      const arg = collection.insertOne.mock.calls[0][0] as MongoShortUrl
      expect(arg.code).toBe('abc123')
      expect(arg.originalUrl).toBe('https://ex.com')
      expect(arg.schemaVersion).toBeInstanceOf(Int32)
      expect(arg.schemaVersion.valueOf()).toBe(1)
    })

    it('throws CodeExistsError when duplicate key error occurs', async () => {
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))
      const dupErr = new MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      })
      collection.insertOne.mockRejectedValue(dupErr)

      await expect(repo.save(entity)).rejects.toBeInstanceOf(CodeExistsError)
      expect(collection.insertOne).toHaveBeenCalled()
    })

    it('throws ImmutableCodeError when trying to save an already-persisted entity', async () => {
      const entity = new ShortUrl('some-id', 'abc123', new ValidUrl('https://ex.com'), false)

      await expect(repo.save(entity)).rejects.toBeInstanceOf(ImmutableCodeError)
      expect(collection.insertOne).not.toHaveBeenCalled()
    })
  })
})
