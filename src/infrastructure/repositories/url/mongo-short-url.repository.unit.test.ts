import { Collection, Db, Int32, MongoServerError, ObjectId } from 'mongodb'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
type Success<T> = T & { ok: true }
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

  describe('findByCode()', () => {
    it('returns Ok(ShortUrl) when a document is found', async () => {
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
      const res = await repo.findByCode('abc123')
      expect(collection.findOne).toHaveBeenCalledWith({ code: 'abc123' })
      expect(res.ok).toBe(true)
      const success = res as Success<typeof res>
      // value cannot be null here because we mocked a document
      expect(success.value!.code).toBe('abc123')
      expect(success.value!.url).toBe('https://example.com')
    })
    it('returns Ok(null) when no document is found', async () => {
      collection.findOne.mockResolvedValue(null)
      const res = await repo.findByCode('missing')
      expect(collection.findOne).toHaveBeenCalledWith({ code: 'missing' })
      expect(res.ok).toBe(true)
      expect(res.ok && res.value).toBeNull()
    })
  })

  describe('save()', () => {
    it('returns Ok and inserts a new ShortUrl document when not persisted', async () => {
      const urlRes = ValidUrl.create('https://ex.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create(
        '',
        'abc123',
        (urlRes as Success<typeof urlRes>).value,
        'user-42',
      )
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
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
      const urlRes = ValidUrl.create('https://ex.com')
      expect(urlRes.ok).toBe(true)
      const entityRes = ShortUrl.create('', 'abc123', (urlRes as Success<typeof urlRes>).value)
      expect(entityRes.ok).toBe(true)
      const entity = (entityRes as Success<typeof entityRes>).value
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
      // Simulate persisted entity via cast
      const entity = {
        isNew: () => false,
        code: 'abc123',
        url: 'https://ex.com',
        userId: undefined,
      } as unknown as ShortUrl

      const res = await repo.save(entity)
      expect(res.ok).toBe(false)
      const failure: Failure<typeof res> = res as Failure<typeof res>
      expect(failure.error.kind).toBe('domain')
      expect(failure.error.type).toBe('ImmutableCode')
      expect(collection.insertOne).not.toHaveBeenCalled()
    })
  })
})
