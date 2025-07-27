export abstract class BaseEntity {
  constructor(public readonly id: string = '') {}

  public isPersisted(): boolean {
    return !!this.id
  }
}
