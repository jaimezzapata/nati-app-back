import { Router } from 'express'
import { authRequired, adminOnly } from '../middlewares/auth.js'
import { getContributions, createContribution, updateContribution, deleteContribution, requestContribution, getPendingContributions, reviewContribution } from '../controllers/contributionsController.js'

const router = Router()

router.get('/', authRequired, getContributions)
router.get('/pending', authRequired, adminOnly, getPendingContributions)
router.post('/', authRequired, adminOnly, createContribution)
router.post('/request', authRequired, requestContribution)
router.put('/:id', authRequired, adminOnly, updateContribution)
router.put('/:id/review', authRequired, adminOnly, reviewContribution)
router.delete('/:id', authRequired, adminOnly, deleteContribution)

export default router

