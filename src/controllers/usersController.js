import { supabase } from '../config/supabase.js'
import bcrypt from 'bcryptjs'

export async function listUsers(req, res) {
  const { data, error } = await supabase.from('users').select('id, name, phone, member_number, role').order('name')
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  res.json({ users: data })
}

export async function createUser(req, res) {
  const { name, phone, memberNumber, role, password } = req.body
  if (!name || !phone || !memberNumber || !role) return res.status(400).json({ message: 'Datos incompletos' })

  if (role !== 'admin' && role !== 'member') return res.status(400).json({ message: 'Rol inválido' })
  if (role === 'admin' && !password) return res.status(400).json({ message: 'Contraseña requerida' })

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .or(`phone.eq.${phone},member_number.eq.${memberNumber}`)
    .maybeSingle()

  if (existingUser) {
    return res.status(400).json({ message: 'El teléfono o el número de socio ya están en uso' })
  }

  const passwordHash = role === 'admin' ? await bcrypt.hash(password, 10) : null
  const { data, error } = await supabase
    .from('users')
    .insert([{ name, phone, member_number: memberNumber, role, password_hash: passwordHash }])
    .select('id, name, phone, member_number, role')
    .maybeSingle()
  if (error) {
    console.error('Create user error:', error)
    return res.status(400).json({ message: 'No se pudo crear el usuario', error })
  }
  res.status(201).json({ user: data })
}

export async function getUser(req, res) {
  const id = req.params.id
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, member_number, role')
    .eq('id', id)
    .maybeSingle()
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}

export async function updateUser(req, res) {
  const id = req.params.id
  const { name, phone, memberNumber, role, password } = req.body

  const updates = {}
  if (name != null) updates.name = name
  if (phone != null) updates.phone = phone
  if (memberNumber != null) updates.member_number = memberNumber
  if (role != null) updates.role = role

  if (role != null && role !== 'admin' && role !== 'member') {
    return res.status(400).json({ message: 'Rol inválido' })
  }

  if (role === 'admin' && password) updates.password_hash = await bcrypt.hash(password, 10)
  if (role === 'member') updates.password_hash = null

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Sin cambios' })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, name, phone, member_number, role')
    .maybeSingle()

  if (error) return res.status(400).json({ message: 'No se pudo actualizar el usuario' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}

export async function deleteUser(req, res) {
  const id = req.params.id
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return res.status(400).json({ message: 'No se pudo eliminar el usuario' })
  res.status(204).send()
}
