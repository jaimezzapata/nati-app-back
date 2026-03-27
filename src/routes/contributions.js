import { Router } from 'express'
import { authRequired, adminOnly } from '../middlewares/auth.js'
import { getContributions, createContribution, updateContribution, deleteContribution } from '../controllers/contributionsController.js'

const router = Router()

router.get('/', authRequired, getContributions)
router.post('/', authRequired, adminOnly, createContribution)
router.put('/:id', authRequired, adminOnly, updateContribution)
router.delete('/:id', authRequired, adminOnly, deleteContribution)

export default router

