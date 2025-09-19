import { PgClient } from '@infrastructure/clients/pg-client.js'
import { Migration } from '@infrastructure/db/migrations/types.js'

/**
 * Creates the auth.refresh_tokens table, its enum type, indexes and trigger.
 */
export class CreateRefreshToken extends Migration<PgClient> {
  constructor(ctx: PgClient, id: string) {
    super(ctx, id)
  }

  /**
   * Runs the migration to create the auth.refresh_tokens table, enum type, indexes and trigger.
   */
  async up(): Promise<void> {
    await this.ctx.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'auth' AND t.typname = 'refresh_status'
        ) THEN
          CREATE TYPE auth.refresh_status AS ENUM (
           'active', 'rotated', 'revoked', 'expired', 'reused_detected'
          );
        END IF;
      END$$;
    `)

    await this.ctx.query(`
      CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
        id           uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id   uuid                NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
        user_id      uuid                NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
        hash         bytea               NOT NULL,
        hash_algo    TEXT                NOT NULL DEFAULT 'HMAC-SHA256',
        status       auth.refresh_status NOT NULL DEFAULT 'active',
        prev_token   uuid                REFERENCES auth.refresh_tokens,
        issued_at    timestamptz         NOT NULL DEFAULT now(),
        last_used_at timestamptz,
        ip inet,
        user_agent text
        created_at   timestamptz DEFAULT now(),
        updated_at   timestamptz DEFAULT now()
      )
    `)

    await this.ctx.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_sid_status ON auth.refresh_tokens(session_id) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_prev_token ON auth.refresh_tokens(prev_token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON auth.refresh_tokens(user_id) WHERE status = 'active';
    `)

    await this.ctx.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_refresh_token_touch_updated_at'
        ) THEN
          CREATE TRIGGER trg_refresh_token_touch_updated_at
          BEFORE UPDATE ON auth.refresh_tokens
          FOR EACH ROW
          EXECUTE FUNCTION app.trg_touch_updated_at();
        END IF;
      END$$
    `)
  }
}

/**
 * Factory function that returns the migration instance for creating the refresh_tokens table, enum, indexes and trigger.
 * @param {PgClient} ctx The PostgreSQL client context.
 * @param {string} id The unique migration id.
 * @returns {Migration<PgClient>} The migration instance.
 */
export default function createRefreshToken(ctx: PgClient, id: string): Migration<PgClient> {
  return new CreateRefreshToken(ctx, id)
}
