import { Router } from 'express'
import { ShortenerController } from '../controllers/shortener.controller.js'

export function createRedirectRoutes(shortenerController: ShortenerController): Router {
  const redirectRouter = Router()

  redirectRouter.get('/:id', shortenerController.resolve.bind(shortenerController))

  return redirectRouter
}
