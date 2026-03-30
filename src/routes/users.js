import { Router } from 'express'
import { listUsers, createUser, getUser, updateUser, deleteUser, listPendingRegistrations, updateProfile } from '../controllers/usersController.js'
import { authRequired, adminOnly } from '../middlewares/auth.js'

const router = Router()

router.get('/pending', authRequired, adminOnly, listPendingRegistrations)
router.put('/profile', authRequired, updateProfile)
router.get('/', authRequired, adminOnly, listUsers)
router.post('/', authRequired, adminOnly, createUser)
router.get('/:id', authRequired, adminOnly, getUser)
router.put('/:id', authRequired, adminOnly, updateUser)
router.delete('/:id', authRequired, adminOnly, deleteUser)

export default router
