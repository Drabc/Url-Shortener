import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import {
  EntityAlreadyExistsError,
  ImmutableCodeError,
} from '@infrastructure/errors/repository.error.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import {
  PostgresShortUrlRepository,
  UrlRow,
} from '@infrastructure/repositories/url/postgres-short-url.repository.js'

describe('PostgresShortUrlRepository', () => {
  let pg: { findOne: jest.Mock; insertOrThrow: jest.Mock }
  let repo: PostgresShortUrlRepository

  beforeEach(() => {
    pg = { findOne: jest.fn(), insertOrThrow: jest.fn() }
    repo = new PostgresShortUrlRepository(pg as unknown as PgClient)
  })

  describe('findByCode()', () => {
    it('returns a ShortUrl when a row is found', async () => {
      const row: UrlRow = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'abc123',
        original_url: 'https://example.com',
        user_id: 'user-77',
        created_at: new Date(),
        updated_at: new Date(),
      }

      pg.findOne.mockResolvedValue(row)

      const result = await repo.findByCode('abc123')

      expect(pg.findOne).toHaveBeenCalledWith(
        'select id, code, original_url, user_id from app.short_urls where code = $1',
        ['abc123'],
      )
      expect(result).toBeInstanceOf(ShortUrl)
      expect(result?.code).toBe('abc123')
      expect(result?.url).toBe('https://example.com')
      expect(result?.userId).toBe('user-77')
    })

    it('returns null when no row is found', async () => {
      pg.findOne.mockResolvedValue(null)

      const result = await repo.findByCode('missing')

      expect(pg.findOne).toHaveBeenCalledWith(
        'select id, code, original_url, user_id from app.short_urls where code = $1',
        ['missing'],
      )
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('inserts a new row for a non-persisted entity (anonymous)', async () => {
      pg.insertOrThrow.mockResolvedValue(undefined)
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      await expect(repo.save(entity)).resolves.toBeUndefined()

      expect(pg.insertOrThrow).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc123', 'https://ex.com', null],
      )
    })

    it('inserts a new row with user_id for a user-owned short url', async () => {
      pg.insertOrThrow.mockResolvedValue(undefined)
      const entity = new ShortUrl('', 'abc999', new ValidUrl('https://ex2.com'), 'user-22')

      await expect(repo.save(entity)).resolves.toBeUndefined()

      expect(pg.insertOrThrow).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc999', 'https://ex2.com', 'user-22'],
      )
    })

    it('throws EntityAlreadyExistsError when underlying client signals duplicate', async () => {
      pg.insertOrThrow.mockRejectedValue(new EntityAlreadyExistsError())
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      await expect(repo.save(entity)).rejects.toBeInstanceOf(EntityAlreadyExistsError)
    })

    it('throws ImmutableCodeError when entity is already persisted', async () => {
      const entity = new ShortUrl(
        '11111111-1111-1111-1111-111111111111',
        'abc123',
        new ValidUrl('https://ex.com'),
        undefined,
        false,
      )

      await expect(repo.save(entity)).rejects.toBeInstanceOf(ImmutableCodeError)
      expect(pg.insertOrThrow).not.toHaveBeenCalled()
    })
  })
})
