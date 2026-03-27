import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import contributionRoutes from './routes/contributions.js'
import reportRoutes from './routes/reports.js'

const app = express()

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true)
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/contributions', contributionRoutes)
app.use('/reports', reportRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

export default app
