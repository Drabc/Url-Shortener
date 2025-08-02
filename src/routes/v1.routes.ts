import { Router } from 'express'

/**
 * Creates a router for version 1 of the API.
 * @param {...Router} routers - The routers to be included in the v1 API.
 * @returns {Router} - The configured v1 router.
 */
export function createV1Router(...routers: [Router, ...Router[]]): Router {
  const v1Router = Router()
  v1Router.use('/v1', routers)
  return v1Router
}
