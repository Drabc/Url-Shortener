import { Router } from 'express'

export function createV1Router(...routers: [Router, ...Router[]]): Router {
  const v1Router = Router()
  v1Router.use('/v1', routers)
  return v1Router
}
