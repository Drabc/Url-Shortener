import { Client } from 'pg'

import { config } from '../src/infrastructure/config/index.js'
import { logger } from '../src/infrastructure/logging/logger.js'

(async () => {
  const client = new Client({ user: config.postgresUser, password: config.postgresPassword, host: config.postgresHost })
  await client.connect()
  await terminateConnections(client, config.postgresDb)
  await client.query(`DROP DATABASE IF EXISTS ${config.postgresDb}`)
  await client.end()
  logger.info(`Dropped ${config.postgresDb}`)
})()

async function terminateConnections(client: Client, db: string): Promise<void> {
  await client.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 and pid != pg_backend_pid()
  `, [db])
}
