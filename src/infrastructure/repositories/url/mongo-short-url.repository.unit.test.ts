import { Collection, Db, Int32, MongoServerError, ObjectId } from 'mongodb'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
// local type helper mirroring pattern used elsewhere
type Failure<T> = Exclude<T, { ok: true }>
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
        userId: 'user-1',
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
    it('returns Ok and inserts a new ShortUrl document when not persisted', async () => {
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'), 'user-42')
      collection.insertOne.mockResolvedValue({
        acknowledged: true,
        insertedId: new ObjectId(),
      })

      const res = await repo.save(entity)

      expect(res.ok).toBe(true)
      expect(collection.insertOne).toHaveBeenCalledTimes(1)
      const arg = collection.insertOne.mock.calls[0][0] as MongoShortUrl
      expect(arg.code).toBe('abc123')
      expect(arg.originalUrl).toBe('https://ex.com')
      expect(arg.userId).toBe('user-42')
      expect(arg.schemaVersion).toBeInstanceOf(Int32)
      expect(arg.schemaVersion.valueOf()).toBe(1)
    })

    it('returns DuplicateCode error when duplicate key error occurs', async () => {
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))
      const dupErr = new MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      })
      collection.insertOne.mockRejectedValue(dupErr)

      const res = await repo.save(entity)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('DuplicateCode')
      expect(collection.insertOne).toHaveBeenCalled()
    })

    it('returns ImmutableCode error when trying to save an already-persisted entity', async () => {
      const entity = new ShortUrl(
        'some-id',
        'abc123',
        new ValidUrl('https://ex.com'),
        undefined,
        false,
      )

      const res = await repo.save(entity)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('ImmutableCode')
      expect(collection.insertOne).not.toHaveBeenCalled()
    })
  })
})
