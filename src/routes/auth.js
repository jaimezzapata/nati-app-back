import { Router } from 'express'
import { login, me, register, verifyEmail } from '../controllers/authController.js'
import { authRequired } from '../middlewares/auth.js'

const router = Router()

router.post('/register', register)
router.post('/verify', verifyEmail)
router.post('/login', login)
router.get('/me', authRequired, me)

export default router

