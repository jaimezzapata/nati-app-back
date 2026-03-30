import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import contributionRoutes from './routes/contributions.js'
import reportRoutes from './routes/reports.js'
import loanRoutes from './routes/loans.js'
import settingsRoutes from './routes/settings.js'

const app = express()

app.use(cors({
  origin: true, // Permite cualquier origen en producción/desarrollo (o puedes poner el array con 'https://nati-app-front.vercel.app')
  credentials: true
}))

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/contributions', contributionRoutes)
app.use('/reports', reportRoutes)
app.use('/loans', loanRoutes)
app.use('/settings', settingsRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

export default app
