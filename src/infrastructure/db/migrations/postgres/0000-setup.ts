import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Creates app and auth schema
 */
class CreateInitialSetup extends Migration<PgClient> {
  public constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Executes the migration to create the urls table and index.
   * @returns {Promise<void>}
   */
  async up(): Promise<void> {
    await this.ctx.query('CREATE SCHEMA IF NOT EXISTS app')
    await this.ctx.query('CREATE SCHEMA IF NOT EXISTS auth')

    await this.ctx.query(`
      CREATE OR REPLACE FUNCTION app.trg_touch_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- bump only when something actually changed
        IF (NEW.*) IS DISTINCT FROM (OLD.*) THEN
          NEW.updated_at := now();
        END IF;
        RETURN NEW;
      END
      $$;
    `)
  }
}

/**
 * Factory for the Postgres initial app setup.
 * @param {PgClient} client - Postgres connection pool
 * @param {string} id - migration identifier (e.g., 0001-create-urls)
 * @returns {CreateInitialSetup} A new migration instance for creating initial table setup
 */
export default function createPostgresInitialSetupMigration(client: PgClient, id: string) {
  return new CreateInitialSetup(client, id)
}
