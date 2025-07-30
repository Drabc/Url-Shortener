import { ShortUrl } from '../../domain/entities/short-url.js'

export interface IUrlRepository {
  save(entity: ShortUrl): Promise<void>
  findById(id: string): Promise<ShortUrl | null>
}
