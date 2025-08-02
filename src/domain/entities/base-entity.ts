/**
 * Base entity class that provides a common structure for all entities.
 * @param {string} id - The unique identifier for the entity. Defaults to an empty string.
 */
export abstract class BaseEntity {
  constructor(public readonly id: string = '') {}

  /**
   * Checks if the entity has been persisted (i.e., has a non-empty ID).
   * @returns {boolean} True if the entity has been persisted, false otherwise.
   */
  public isPersisted(): boolean {
    return !!this.id
  }
}
