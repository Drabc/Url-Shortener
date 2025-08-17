import { Logger } from 'pino'
import { Db } from 'mongodb'

import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'
import {
  Migration,
  MigrationPlan,
} from '@infrastructure/db/migrations/types.js'
import { MigrationRunner } from '@infrastructure/db/migrations/migration-runner.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'

describe('MigrationRunner', () => {
  let planner: jest.Mocked<MigrationPlanner>
  let plan: jest.Mocked<MigrationPlan<Db>>
  let migration: jest.Mocked<Migration<Db>>
  let logger: jest.Mocked<Logger>
  let runner: MigrationRunner
  let connections = {} as unknown as jest.Mocked<PersistenceConnections>

  beforeEach(() => {
    migration = {
      up: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<Migration<Db>>
    plan = {
      migrations: [migration],
      acquireLock: jest.fn().mockResolvedValue(null),
      releaseLock: jest.fn().mockResolvedValue(null),
      commitMigration: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<MigrationPlan<Db>>
    planner = {
      plans: jest.fn().mockResolvedValue([plan]),
    } as unknown as jest.Mocked<MigrationPlanner>
    logger = {
      info: jest.fn(),
    } as unknown as jest.Mocked<Logger>
    runner = new MigrationRunner(planner, logger)
  })

  afterEach(() => jest.resetAllMocks())

  describe('run()', () => {
    it('should not run any migrations if there are no plans', async () => {
      planner.plans = jest.fn().mockResolvedValue([])
      await runner.run(connections)

      expect(planner.plans).toHaveBeenCalledWith(connections)
      expect(plan.acquireLock).not.toHaveBeenCalled()
    })

    it('should not run any migrations if there a plans, but no migrations', async () => {
      const emptyPlan = {
        ...plan,
        migrations: [],
      } as unknown as jest.Mocked<MigrationPlan<Db>>
      planner.plans = jest.fn().mockResolvedValue([emptyPlan])

      await runner.run(connections)

      expect(planner.plans).toHaveBeenCalled()
      expect(plan.acquireLock).not.toHaveBeenCalled()
    })

    it('should run the planned migrations', async () => {
      await runner.run(connections)

      expect(plan.acquireLock).toHaveBeenCalled()
      expect(migration.up).toHaveBeenCalled()
      expect(plan.commitMigration).toHaveBeenCalledWith(migration)
      expect(plan.releaseLock).toHaveBeenCalled()
    })

    it('should release the lock if the migration fails', async () => {
      migration.up = jest.fn().mockRejectedValue(new Error('fail migration'))

      await expect(runner.run(connections)).rejects.toThrow()

      expect(plan.acquireLock).toHaveBeenCalled()
      expect(plan.releaseLock).toHaveBeenCalled()
    })
  })
})
