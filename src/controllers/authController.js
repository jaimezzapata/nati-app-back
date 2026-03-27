import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabase } from '../config/supabase.js'

export async function login(req, res) {
  const { phone, password } = req.body
  if (!phone) return res.status(400).json({ message: 'Teléfono requerido' })
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, member_number, role, password_hash')
    .eq('phone', phone)
    .maybeSingle()
  if (error) {
    console.error('Login Supabase error:', error);
    return res.status(500).json({ message: 'Error de servidor', error });
  }
  if (!data) return res.status(401).json({ message: 'Usuario no registrado' })

  if (data.role === 'admin') {
    if (!password) return res.status(400).json({ message: 'Contraseña requerida' })
    if (!data.password_hash) return res.status(400).json({ message: 'Admin sin contraseña configurada' })
    const ok = await bcrypt.compare(password, data.password_hash)
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' })
  }

  const user = { id: data.id, name: data.name, phone: data.phone, member_number: data.member_number, role: data.role }
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      memberNumber: user.member_number
    },
    process.env.JWT_SECRET,
    { expiresIn: '2d' }
  )
  res.json({ token, user })
}

export async function me(req, res) {
  const { id } = req.user
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, member_number, role')
    .eq('id', id)
    .maybeSingle()
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}
