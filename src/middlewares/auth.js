import jwt from 'jsonwebtoken'

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) return res.status(401).json({ message: 'No autorizado' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Sesión inválida' })
  }
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' })
  next()
}

