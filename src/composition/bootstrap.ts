import { Logger } from 'pino'

import { Config } from '@infrastructure/config/config.js'
import {
  createPersistenceConnections,
  PersistenceConnections,
} from '@infrastructure/clients/persistence-connections.js'

/**
 * Bootstraps the persistence layer by creating connections and executing any pending migrations.
 * @param {Config} config The application configuration.
 * @param {Logger} logger The logger instance to record operational events.
 * @returns {Promise<PersistenceConnections>} The established persistence connections.
 */
export async function bootstrap(config: Config, logger: Logger): Promise<PersistenceConnections> {
  return await createPersistenceConnections(config, logger)
}
