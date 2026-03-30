import { Router } from 'express'
import { authRequired, adminOnly } from '../middlewares/auth.js'
import { getLoans, requestLoan, getPendingLoans, reviewLoan, getLoanEligibility } from '../controllers/loansController.js'

const router = Router()

router.get('/', authRequired, getLoans)
router.get('/eligibility', authRequired, getLoanEligibility)
router.post('/request', authRequired, requestLoan)
router.get('/pending', authRequired, adminOnly, getPendingLoans)
router.put('/:id/review', authRequired, adminOnly, reviewLoan)

export default router

