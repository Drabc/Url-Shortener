import { vi, Mocked } from 'vitest'
import { Logger } from 'pino'
import { Db } from 'mongodb'

import { MigrationPlanner } from '@infrastructure/db/migrations/migration-planner.js'
import { Migration, MigrationPlan } from '@infrastructure/db/migrations/types.js'
import { MigrationRunner } from '@infrastructure/db/migrations/migration-runner.js'
import { PersistenceConnections } from '@infrastructure/clients/persistence-connections.js'

describe('MigrationRunner', () => {
  let planner: Mocked<MigrationPlanner>
  let plan: Mocked<MigrationPlan<Db>>
  let migration: Mocked<Migration<Db>>
  let logger: Mocked<Logger>
  let runner: MigrationRunner
  let connections = {} as unknown as Mocked<PersistenceConnections>

  beforeEach(() => {
    migration = {
      up: vi.fn().mockResolvedValue(null),
    } as unknown as Mocked<Migration<Db>>
    plan = {
      migrations: [migration],
      acquireLock: vi.fn().mockResolvedValue(null),
      releaseLock: vi.fn().mockResolvedValue(null),
      commitMigration: vi.fn().mockResolvedValue(null),
    } as unknown as Mocked<MigrationPlan<Db>>
    planner = {
      plans: vi.fn().mockResolvedValue([plan]),
    } as unknown as Mocked<MigrationPlanner>
    logger = {
      info: vi.fn(),
    } as unknown as Mocked<Logger>
    runner = new MigrationRunner(planner, logger)
  })

  afterEach(() => vi.resetAllMocks())

  describe('run()', () => {
    it('should not run any migrations if there are no plans', async () => {
      planner.plans = vi.fn().mockResolvedValue([])
      await runner.run(connections)

      expect(planner.plans).toHaveBeenCalledWith(connections)
      expect(plan.acquireLock).not.toHaveBeenCalled()
    })

    it('should not run any migrations if there a plans, but no migrations', async () => {
      const emptyPlan = {
        ...plan,
        migrations: [],
      } as unknown as Mocked<MigrationPlan<Db>>
      planner.plans = vi.fn().mockResolvedValue([emptyPlan])

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
      migration.up = vi.fn().mockRejectedValue(new Error('fail migration'))

      await expect(runner.run(connections)).rejects.toThrow()

      expect(plan.acquireLock).toHaveBeenCalled()
      expect(plan.releaseLock).toHaveBeenCalled()
    })
  })
})
