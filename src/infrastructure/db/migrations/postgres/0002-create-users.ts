import { Migration } from '@infrastructure/db/migrations/types.js'
import { PgClient } from '@infrastructure/clients/pg-client.js'

/**
 * Creates the 'app.users' table in Postgres.
 * Columns:
 * - id: UUID, primary key, default generated
 * - first_name: text, not null
 * - last_name: text, not null
 * - email: citext, not null, unique
 * - password_hash: text, not null
 * - password_updated_at: timestamptz, not null, default now()
 * - created_at: timestamptz, not null, default now()
 * - updated_at: timestamptz, not null, default now()
 * Also creates a trigger to update 'updated_at' on row updates.
 */
class CreateUserMigration extends Migration<PgClient> {
  public constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Runs the migration to create the 'users' table.
   */
  public async up(): Promise<void> {
    await this.ctx.query(`
      CREATE TABLE app.users (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name          text NOT NULL,
        last_name           text NOT NULL,
        email               citext NOT NULL UNIQUE,
        password_hash       text  NOT NULL,
        password_updated_at timestamptz NOT NULL DEFAULT now(),
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now()
      )
    `)

    await this.ctx.query(`
      create trigger trg_users_touch_updated_at
      before update on app.users
      for each row
      execute function app.trg_touch_updated_at(i)
    `)
  }
}

/**
 * Factory function to create a new CreateUserMigration instance.
 * @param {PgClient} client - The PostgreSQL connection pool.
 * @param {string} id - The migration identifier.
 * @returns {CreateUserMigration} A new CreateUserMigration instance.
 */
export default function createUserMigration(
  client: PgClient,
  id: string,
): CreateUserMigration {
  return new CreateUserMigration(client, id)
}
