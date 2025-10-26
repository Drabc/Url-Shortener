import { Client } from 'pg'

import { config } from '../src/infrastructure/config/index.js'
import { logger } from '../src/infrastructure/logging/logger.js'

(async () => {
  const client = new Client({ user: config.postgresUser, password: config.postgresPassword, host: config.postgresHost })
  await client.connect()
  await client.query(`CREATE DATABASE ${config.postgresDb}`)
  client.end() // Best effort

  const dbClient = new Client({ user: config.postgresUser, password: config.postgresPassword, host: config.postgresHost, database: config.postgresDb })
  await dbClient.connect()
  await createMigrationSupport(dbClient)
  dbClient.end() // Best effort


  logger.info(`Created ${config.postgresDb}`)
})()

async function createMigrationSupport(client: Client): Promise<void> {
  await client.query(`CREATE SCHEMA meta`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS meta.migration_locks (
      id text PRIMARY KEY,
      holder text NOT NULL,
      acquired_at timestamptz NOT NULL DEFAULT NOW(),
      expires_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS meta.schema_migrations (
      id text PRIMARY KEY,
      ran_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
}
