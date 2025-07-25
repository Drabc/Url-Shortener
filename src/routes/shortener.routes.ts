import { Router } from 'express'
import { ShortenerController } from '../controllers/shortener.controller.js'

export function createShortenerRouter(controller: ShortenerController): Router {
  const shortenerRouter = Router()
  shortenerRouter.post('/shorten', controller.shorten.bind(controller))
  return shortenerRouter
}
