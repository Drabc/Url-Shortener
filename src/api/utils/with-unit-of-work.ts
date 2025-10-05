import { Request, Response, NextFunction } from 'express'

import { IUnitOfWork } from '@application/ports/unit-of-work.js'

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Wraps an Express async handler in a Unit of Work (UoW) boundary.
 * @param {IUnitOfWork} uow - Unit of Work controlling execution scope.
 * @param {Handler} handler - The async Express handler to execute inside the UoW.
 * @returns {Handler} A new handler wrapped with Unit of Work management.
 * @example
 * router.post('/accounts', withUnitOfWork(uow, async (req, res) => {
 *   // ... Business Logic
 *   res.status(201).json(account)
 * }))
 */
export const withUnitOfWork = (uow: IUnitOfWork, handler: Handler): Handler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await uow.run(() => handler(req, res, next))
    } catch (e) {
      next(e)
    }
  }
}
