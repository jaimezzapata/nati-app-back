import { Router } from 'express'
import { authRequired, adminOnly } from '../middlewares/auth.js'
import { reportSummary, dashboardMetrics } from '../controllers/reportsController.js'

const router = Router()

router.get('/summary', authRequired, adminOnly, reportSummary)
router.get('/dashboard', authRequired, adminOnly, dashboardMetrics)

export default router

