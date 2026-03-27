import 'dotenv/config'
import app from './app.js'

const port = process.env.PORT || 4000
app.listen(port, () => {
  process.stdout.write(`natillera backend running on :${port}\n`)
})

