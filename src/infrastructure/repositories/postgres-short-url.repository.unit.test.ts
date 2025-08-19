import { Pool } from 'pg'

import { ShortUrl } from '@domain/entities/short-url.js'
import { ValidUrl } from '@domain/value-objects/valid-url.js'
import {
  CodeExistsError,
  ImmutableCodeError,
} from '@infrastructure/errors/repository.error.js'
import {
  PostgresShortUrlRepository,
  UrlRow,
} from '@infrastructure/repositories/postgres-short-url.repository.js'

describe('PostgresShortUrlRepository', () => {
  let pool: { query: jest.Mock }
  let repo: PostgresShortUrlRepository

  beforeEach(() => {
    pool = { query: jest.fn() }
    repo = new PostgresShortUrlRepository(pool as unknown as Pool)
  })

  describe('findByCode()', () => {
    it('returns a ShortUrl when a row is found', async () => {
      const row: UrlRow = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'abc123',
        original_url: 'https://example.com',
        created_at: new Date(),
        updated_at: new Date(),
      }

      pool.query.mockResolvedValue({ rowCount: 1, rows: [row] })

      const result = await repo.findByCode('abc123')

      expect(pool.query).toHaveBeenCalledWith(
        'select id, code, original_url from urls where code = $1',
        ['abc123'],
      )
      expect(result).toBeInstanceOf(ShortUrl)
      expect(result?.code).toBe('abc123')
      expect(result?.url).toBe('https://example.com')
    })

    it('returns null when no row is found', async () => {
      pool.query.mockResolvedValue({ rowCount: 0, rows: [] })

      const result = await repo.findByCode('missing')

      expect(pool.query).toHaveBeenCalledWith(
        'select id, code, original_url from urls where code = $1',
        ['missing'],
      )
      expect(result).toBeNull()
    })
  })

  describe('save()', () => {
    it('inserts a new row for a non-persisted entity', async () => {
      pool.query.mockResolvedValue({})
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      await expect(repo.save(entity)).resolves.toBeUndefined()

      expect(pool.query).toHaveBeenCalledWith(
        'insert into urls (code, original_url, created_at, updated_at) values ($1, $2, now(), now())',
        ['abc123', 'https://ex.com'],
      )
    })

    it('throws CodeExistsError on unique violation (23505)', async () => {
      pool.query.mockRejectedValue({ code: '23505' })
      const entity = new ShortUrl('', 'abc123', new ValidUrl('https://ex.com'))

      await expect(repo.save(entity)).rejects.toBeInstanceOf(CodeExistsError)
    })

    it('throws ImmutableCodeError when entity is already persisted', async () => {
      const entity = new ShortUrl(
        '11111111-1111-1111-1111-111111111111',
        'abc123',
        new ValidUrl('https://ex.com'),
      )

      await expect(repo.save(entity)).rejects.toBeInstanceOf(ImmutableCodeError)
      expect(pool.query).not.toHaveBeenCalled()
    })
  })
})
