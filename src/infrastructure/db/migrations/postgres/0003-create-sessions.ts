import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Migration that creates the auth schema, session_status enum, sessions table, index, and trigger.
 * @param ctx PostgreSQL client used to run queries.
 * @param id Unique migration identifier.
 */
class CreateSessions extends Migration<PgClient> {
  constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Runs the migration creating the auth schema, session_status enum, sessions table, index, and trigger.
   */
  async up(): Promise<void> {
    await this.ctx.query('CREATE SCHEMA IF NOT EXISTS auth;')

    await this.ctx.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'auth' AND t.typname = 'session_status'
        ) THEN
          CREATE TYPE auth.session_status AS ENUM ('active', 'revoked', 'expired', 'reuse_detected');
        END IF;
      END$$;
    `)

    await this.ctx.query(`
      CREATE TABLE IF NOT EXISTS auth.sessions (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
        client_id      text NOT NULL,
        ip             inet,
        user_agent     text,
        status         auth.session_status NOT NULL DEFAULT 'active',
        last_used_at   timestamptz NOT NULL DEFAULT now(),
        expired_at     timestamptz NOT NULL,
        revoked_at     timestamptz,
        revoked_reason text,
        created_at     timestamptz DEFAULT now(),
        updated_at     timestamptz DEFAULT now()
      );
    `)

    await this.ctx.query(`
      COMMENT ON COLUMN auth.sessions.client_id IS 'device/app identifier';
    `)

    await this.ctx.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
    `)

    await this.ctx.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_sessions_touch_updated_at'
        ) THEN
          CREATE TRIGGER trg_sessions_touch_updated_at
          BEFORE UPDATE ON auth.sessions
          FOR EACH ROW
          EXECUTE FUNCTION app.trg_touch_updated_at();
        END IF;
      END$$
    `)
  }
}

/**
 * Factory function that creates the CreateSessions migration instance.
 * @param {PgClient} client - PostgreSQL client used to execute migration queries.
 * @param {string} id - Unique identifier for the migration.
 * @returns {Migration<PgClient>} A CreateSessions migration instance.
 */
export default function createPostgresSessionsMigration(
  client: PgClient,
  id: string,
): Migration<PgClient> {
  return new CreateSessions(client, id)
}
