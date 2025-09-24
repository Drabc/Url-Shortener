import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Adds nullable user_id column to app.short_urls to support owned short urls.
 * Column: user_id uuid null references app.users(id) on delete set null (assuming users table exists)
 * Also adds an index on user_id for faster lookup of user-owned urls.
 */
class AddUserIdToShortUrlsMigration extends Migration<PgClient> {
  public constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Executes the migration to add user_id column and index if they do not already exist.
   * Uses conditional logic to avoid errors on repeated runs.
   * @returns {Promise<void>}
   */
  async up(): Promise<void> {
    await this.ctx.query(`
     ALTER TABLE app.short_urls
      ADD COLUMN AFTER original_url IF NOT EXISTS user_id uuid NULL;
    `)

    // Create index if not exists
    await this.ctx.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname  = 'fk_short_urls__user'
            AND conrelid = 'app.short_urls'::regclass
        ) THEN
          ALTER TABLE app.short_urls
            ADD CONSTRAINT fk_short_urls__user
            FOREIGN KEY (user_id)
            REFERENCES app."users"(id)
            ON DELETE CASCADE;
        END IF;
      END$$;
    `)

    await this.ctx.query(`
      CREATE INDEX IF NOT EXISTS idx_short_urls_user_id
        ON app.short_urls(user_id);
    `)
  }
}

/**
 * Factory for the migration adding user_id to short_urls.
 * @param {PgClient} client Postgres client
 * @param {string} id migration id
 * @returns {AddUserIdToShortUrlsMigration} migration instance
 */
export default function createAddUserIdToShortUrlsMigration(client: PgClient, id: string) {
  return new AddUserIdToShortUrlsMigration(client, id)
}
