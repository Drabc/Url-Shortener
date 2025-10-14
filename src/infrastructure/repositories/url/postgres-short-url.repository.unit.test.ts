import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'
import {
  PostgresShortUrlRepository,
  UrlRow,
} from '@infrastructure/repositories/url/postgres-short-url.repository.js'

type ErrorMock = {
  ok: boolean
  error: {
    type: string
    kind: string
  }
}

describe('PostgresShortUrlRepository', () => {
  let pg: { findOne: jest.Mock; insert: jest.Mock }
  let repo: PostgresShortUrlRepository

  beforeEach(() => {
    pg = { findOne: jest.fn(), insert: jest.fn() }
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
      pg.insert.mockResolvedValue({ ok: true, value: undefined })
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      const res = await repo.save(entity)
      expect(res.ok).toBe(true)
      expect(pg.insert).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc123', 'https://ex.com', null],
      )
    })

    it('inserts a new row with user_id for a user-owned short url', async () => {
      pg.insert.mockResolvedValue({ ok: true, value: undefined })
      const entity = new ShortUrl('', 'abc999', new ValidUrl('https://ex2.com'), 'user-22')

      const res = await repo.save(entity)
      expect(res.ok).toBe(true)
      expect(pg.insert).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc999', 'https://ex2.com', 'user-22'],
      )
    })

    it('returns domain UnableToSave when underlying client insert fails', async () => {
      pg.insert.mockResolvedValue({ ok: false, error: { kind: 'infra', type: 'UniqueViolation' } })
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      const res = (await repo.save(entity)) as unknown as ErrorMock
      expect(res.ok).toBe(false)
      expect(res.error.type).toBe('UnableToSave')
      expect(res.error.kind).toBe('domain')
    })

    it('returns domain ImmutableCode when entity is already persisted', async () => {
      const entity = new ShortUrl(
        '11111111-1111-1111-1111-111111111111',
        'abc123',
        new ValidUrl('https://ex.com'),
        undefined,
        false,
      )

      const res = (await repo.save(entity)) as unknown as ErrorMock
      expect(res.ok).toBe(false)
      expect(res.error.type).toBe('ImmutableCode')
      expect(res.error.kind).toBe('domain')
      expect(pg.insert).not.toHaveBeenCalled()
    })
  })
})
