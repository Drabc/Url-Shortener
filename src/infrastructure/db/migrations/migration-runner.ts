import { Logger } from 'pino'

import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'

/**
 * MigrationRunner is responsible for executing migration plans
 * @param {MigrationPlanner} planner - The migration planner to generate plans
 * @param {Logger} logger - The logger for logging migration progress
 */
export class MigrationRunner {
  constructor(
    private readonly planner: MigrationPlanner,
    private readonly logger: Logger,
  ) {}

  /**
   * Runs all migration plans using the provided client registry.
   * @param {PersistenceConnections} connections - The registry of persistence connections
   * @returns {Promise<void>} Promise that resolves when all migrations have run.
   */
  public async run(connections: PersistenceConnections): Promise<void> {
    const plans = await this.planner.plans(connections)
    const anyMigrations = plans.some((plan) => plan.migrations.length > 0)

    if (plans.length === 0 || !anyMigrations) {
      this.logger.info('No migrations to run.')
      return
    }

    for (const plan of plans) {
      if (plan.migrations.length === 0) {
        continue
      }

      this.logger.info(`Starting ${plan.displayName}`)
      await plan.acquireLock()

      try {
        for (const migration of plan.migrations) {
          this.logger.info(`Running migration: ${migration.id}`)
          await migration.up()
          await plan.commitMigration(migration)
          this.logger.info(`Completed migration: ${migration.id}`)
        }
      } finally {
        await plan.releaseLock()
      }
    }
  }
}
