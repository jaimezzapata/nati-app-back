import { supabase } from '../config/supabase.js'
import bcrypt from 'bcryptjs'

export async function listUsers(req, res) {
  const { data, error } = await supabase.from('users').select('id, name, phone, email, gender, member_number, role').order('name')
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  res.json({ users: data })
}

export async function createUser(req, res) {
  const { name, phone, email, gender, memberNumber, role, password } = req.body
  if (!name || !phone || !memberNumber || !role) return res.status(400).json({ message: 'Datos incompletos' })

  if (role !== 'admin' && role !== 'member') return res.status(400).json({ message: 'Rol inválido' })
  if (role === 'admin' && !password) return res.status(400).json({ message: 'Contraseña requerida' })
  if (role === 'member' && (!email || !gender)) return res.status(400).json({ message: 'Correo y género requeridos' })

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
    .insert([{
      name,
      phone,
      email: role === 'member' ? email : (email || null),
      gender: role === 'member' ? gender : (gender || null),
      member_number: memberNumber,
      role,
      password_hash: passwordHash,
      is_verified: true
    }])
    .select('id, name, phone, email, gender, member_number, role')
    .maybeSingle()
  if (error) {
    console.error('Create user error:', error)
    // Devolver el mensaje real de la base de datos para saber qué está fallando (ej: constraints, emails duplicados)
    return res.status(400).json({ 
      message: error.message || 'No se pudo crear el usuario', 
      details: error.details, 
      hint: error.hint 
    })
  }
  res.status(201).json({ user: data })
}

export async function getUser(req, res) {
  const id = req.params.id
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, email, gender, member_number, role')
    .eq('id', id)
    .maybeSingle()
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}

export async function updateUser(req, res) {
  const id = req.params.id
  const { name, phone, email, gender, memberNumber, role, password } = req.body

  const updates = {}
  if (name != null) updates.name = name
  if (phone != null) updates.phone = phone
  if (email != null) updates.email = email
  if (gender != null) updates.gender = gender
  if (memberNumber != null) updates.member_number = memberNumber
  if (role != null) updates.role = role

  if (role != null && role !== 'admin' && role !== 'member') {
    return res.status(400).json({ message: 'Rol inválido' })
  }

  if (role === 'admin' && password) updates.password_hash = await bcrypt.hash(password, 10)
  if (role === 'admin') {
    updates.is_verified = true
    if (updates.email === '') updates.email = null
    if (updates.gender === '') updates.gender = null
  }
  if (role === 'member') {
    updates.password_hash = null
    updates.is_verified = true
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Sin cambios' })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, name, phone, email, gender, member_number, role')
    .maybeSingle()

  if (error) return res.status(400).json({ message: 'No se pudo actualizar el usuario' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}

export async function listPendingRegistrations(req, res) {
  const { data, error } = await supabase
    .from('pending_registrations')
    .select('id, name, phone, email, gender, created_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending registrations:', error)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  // Filtrar los que ya expiraron opcionalmente, aunque Supabase podría borrarlos o podemos hacerlo en memoria
  const now = new Date().toISOString()
  const activePending = data.filter(r => r.expires_at > now)

  res.json({ pending: activePending })
}

export async function deleteUser(req, res) {
  const id = req.params.id
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return res.status(400).json({ message: 'No se pudo eliminar el usuario' })
  res.status(204).send()
}
