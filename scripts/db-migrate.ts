import { config } from '../src/infrastructure/config/index.js'
import { logger } from '../src/infrastructure/logging/logger.js'
import { createPersistenceConnections } from '../src/infrastructure/clients/persistence-connections.js'
import { MigrationRunner } from '../src/infrastructure/db/migrations/migration-runner.js'
import { MigrationPlanner } from '../src/infrastructure/db/migrations/migration-planner.js'

(async () => {
  const persistenceConnections = await createPersistenceConnections(config, logger)

  const migrationRunner = new MigrationRunner(new MigrationPlanner(config.migrationsPath), logger)
  logger.info('Checking for migrations...')
  await migrationRunner.run(persistenceConnections)

  persistenceConnections.disconnectAll()
})()
