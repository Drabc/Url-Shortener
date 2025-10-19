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

type Success<T> = T & { ok: true }
type Failure<T> = Exclude<T, { ok: true }>

describe('PostgresShortUrlRepository', () => {
  let pg: { findOne: jest.Mock; insert: jest.Mock }
  let repo: PostgresShortUrlRepository

  beforeEach(() => {
    pg = { findOne: jest.fn(), insert: jest.fn() }
    repo = new PostgresShortUrlRepository(pg as unknown as PgClient)
  })

  describe('findByCode()', () => {
    it('returns Ok(ShortUrl) when a row is found', async () => {
      const row: UrlRow = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'abc123',
        original_url: 'https://example.com',
        user_id: 'user-77',
        created_at: new Date(),
        updated_at: new Date(),
      }

      pg.findOne.mockResolvedValue(row)

      const res = await repo.findByCode('abc123')
      expect(pg.findOne).toHaveBeenCalledWith(
        'select id, code, original_url, user_id from app.short_urls where code = $1',
        ['abc123'],
      )
      expect(res.ok).toBe(true)
      const success = res as { ok: true; value: ShortUrl }
      expect(success.value.code).toBe('abc123')
      expect(success.value.url).toBe('https://example.com')
      expect(success.value.userId).toBe('user-77')
    })

    it('returns Ok(null) when no row is found', async () => {
      pg.findOne.mockResolvedValue(null)

      const res = await repo.findByCode('missing')
      expect(pg.findOne).toHaveBeenCalledWith(
        'select id, code, original_url, user_id from app.short_urls where code = $1',
        ['missing'],
      )
      expect(res.ok).toBe(true)
      expect(res.ok && res.value).toBeNull()
    })
  })

  describe('save()', () => {
    it('inserts a new row for a non-persisted entity (anonymous)', async () => {
      pg.insert.mockResolvedValue({ ok: true, value: undefined })
      const urlRes = ValidUrl.create('https://ex.com')
      expect(urlRes.ok).toBe(true)
      const entityResRaw = ShortUrl.create('', 'abc123', (urlRes as Success<typeof urlRes>).value)
      expect(entityResRaw.ok).toBe(true)
      const entity = (entityResRaw as Success<typeof entityResRaw>).value
      const res = await repo.save(entity)
      expect(res.ok).toBe(true)
      expect(pg.insert).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc123', 'https://ex.com', null],
      )
    })

    it('inserts a new row with user_id for a user-owned short url', async () => {
      pg.insert.mockResolvedValue({ ok: true, value: undefined })
      const urlRes = ValidUrl.create('https://ex2.com')
      expect(urlRes.ok).toBe(true)
      const entityResRaw = ShortUrl.create(
        '',
        'abc999',
        (urlRes as Success<typeof urlRes>).value,
        'user-22',
      )
      expect(entityResRaw.ok).toBe(true)
      const entity = (entityResRaw as Success<typeof entityResRaw>).value
      const res = await repo.save(entity)
      expect(res.ok).toBe(true)
      expect(pg.insert).toHaveBeenCalledWith(
        'insert into app.short_urls (code, original_url, user_id, created_at, updated_at) values ($1, $2, $3, now(), now())',
        ['abc999', 'https://ex2.com', 'user-22'],
      )
    })

    it('returns domain UnableToSave when underlying client insert fails', async () => {
      pg.insert.mockResolvedValue({ ok: false, error: { kind: 'infra', type: 'UniqueViolation' } })
      const urlRes = ValidUrl.create('https://ex.com')
      expect(urlRes.ok).toBe(true)
      const entityResRaw = ShortUrl.create('', 'abc123', (urlRes as Success<typeof urlRes>).value)
      expect(entityResRaw.ok).toBe(true)
      const entity = (entityResRaw as Success<typeof entityResRaw>).value
      const res = (await repo.save(entity)) as unknown as ErrorMock
      expect(res.ok).toBe(false)
      const failure = res as Failure<typeof res>
      expect(failure.error.type).toBe('UnableToSave')
      expect(failure.error.kind).toBe('domain')
    })

    it('returns domain ImmutableCode when entity is already persisted', async () => {
      // To simulate persisted entity, bypass isNew by casting (domain exposes no mutate). Keep previous pattern.
      const entity = {
        isNew: () => false,
        code: 'abc123',
        url: 'https://ex.com',
        userId: undefined,
      } as unknown as ShortUrl

      const res = (await repo.save(entity)) as unknown as ErrorMock
      expect(res.ok).toBe(false)
      expect(res.error.type).toBe('ImmutableCode')
      expect(res.error.kind).toBe('domain')
      expect(pg.insert).not.toHaveBeenCalled()
    })
  })
})
