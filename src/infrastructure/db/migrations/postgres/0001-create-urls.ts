import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Creates the 'app.short_urls' table in Postgres.
 * Columns:
 *  - id uuid primary key default gen_random_uuid()
 *  - code text unique not null
 *  - original_url text not null
 *  - created_at timestamptz not null default now()
 *  - updated_at timestamptz not null default now()
 */
class CreateUrlsTableMigration extends Migration<PgClient> {
  public constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Executes the migration to create the urls table and index.
   * @returns {Promise<void>}
   */
  async up(): Promise<void> {
    // Enable required extension for gen_random_uuid if desired
    await this.ctx.query('create extension if not exists pgcrypto')

    await this.ctx.query(`
      create table if not exists app.short_urls (
        id uuid primary key default gen_random_uuid(),
        code text not null unique,
        original_url text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `)

    await this.ctx.query(`
      create trigger trg_short_urls_touch_updated_at
      before update on app.short_urls
      for each row
      execute function app.trg_touch_updated_at(i)
    `)
  }
}

/**
 * Factory for the Postgres urls table migration.
 * @param {PgClient} client - Postgres connection pool
 * @param {string} id - migration identifier (e.g., 0001-create-urls)
 * @returns {CreateUrlsTableMigration} A new migration instance for creating the urls table
 */
export default function createPostgresUrlsMigration(client: PgClient, id: string) {
  return new CreateUrlsTableMigration(client, id)
}
