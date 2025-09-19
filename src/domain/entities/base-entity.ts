/**
 * Base entity class that provides a common structure for all entities.
 * @param {string} id - The unique identifier for the entity. Defaults to an empty string.
 * @param {boolean} isNew - Whether the instance was newly created or loaded.
 */
export abstract class BaseEntity {
  protected constructor(
    public readonly id: string = '',
    private readonly _isNew: boolean = true,
  ) {}

  /**
   * Whether this entity instance is newly created in the current unit of work.
   * @returns {boolean} True if new, otherwise false.
   */
  public isNew(): boolean {
    return this._isNew
  }
}
