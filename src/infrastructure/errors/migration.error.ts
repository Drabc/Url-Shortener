/**
 * Thrown when unable to commit a migration to the database
 */
export class MigrationCommitError extends Error {
  constructor(migrationId: string) {
    super(`Unable to commit migration: ${migrationId}`)
    this.name = 'MigrationCommitError'
  }
}

/**
 * Thrown when unable to acquire migration lock
 */
export class MigrationLockAcquisitionError extends Error {
  constructor(details: string = '') {
    super(`Failed to acquire migration lock - another migration may be running\n${details}`)
    this.name = 'MigrationLockAcquisitionError'
  }
}

/**
 * Thrown when unable to renew migration lock
 */
export class MigrationLockRenewalError extends Error {
  constructor() {
    super('Unable to renew migration lock')
    this.name = 'MigrationLockRenewalError'
  }
}

/**
 * Thrown when unable to release migration lock
 */
export class MigrationLockReleaseError extends Error {
  constructor() {
    super('Unable to release migration lock')
    this.name = 'MigrationLockReleaseError'
  }
}

/**
 * Thrown when attempting to renew a lock that was never acquired
 */
export class MigrationLockNotAcquiredError extends Error {
  constructor() {
    super('Unable to renew lock. No lock acquired')
    this.name = 'MigrationLockNotAcquiredError'
  }
}

/**
 * Thrown when a migration filename does not follow the required pattern
 * e.g. `0001-some-migration.ts`
 */
export class InvalidMigrationFilenameError extends Error {
  constructor(fileName: string) {
    super(`Invalid migration file name format: ${fileName}`)
    this.name = 'InvalidMigrationFilenameError'
  }
}

/**
 * Thrown when the expected latest migration file cannot be found in the directory
 */
export class LatestMigrationFileNotFoundError extends Error {
  constructor(migrationId: string, directory: string) {
    super(`Latest migration file ${migrationId} not found in ${directory}`)
    this.name = 'LatestMigrationFileNotFoundError'
  }
}
