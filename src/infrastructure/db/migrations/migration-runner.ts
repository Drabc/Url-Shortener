import { Logger } from 'pino'

import { Clients } from '@infrastructure/config/config.js'
import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'

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
   * @param {Partial<Clients>} clientRegistry - Partial registry of database clients.
   * @returns {Promise<void>} Promise that resolves when all migrations have run.
   */
  public async run(clientRegistry: Partial<Clients>): Promise<void> {
    const plans = await this.planner.plans(clientRegistry)
    const anyMigrations = plans.some((plan) => plan.migrations.length > 0)

    if (plans.length === 0 || !anyMigrations) {
      this.logger.info('No migrations to run.')
      return
    }

    for (const plan of plans) {
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
