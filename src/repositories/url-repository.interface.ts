export interface IUrlRepository {
  save(id: string, url: string): Promise<string>
  findById(id: string): Promise<string | null>
}
