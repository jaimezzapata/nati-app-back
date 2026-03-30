import { Router } from 'express'
import { authRequired, adminOnly } from '../middlewares/auth.js'
import { getLoanSettings, updateLoanSettings } from '../controllers/settingsController.js'

const router = Router()

router.get('/loans', authRequired, adminOnly, getLoanSettings)
router.put('/loans', authRequired, adminOnly, updateLoanSettings)

export default router

