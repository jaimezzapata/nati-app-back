import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabase } from '../config/supabase.js'

export async function register(req, res) {
  const { name, phone, email, gender, pin } = req.body
  if (!name || !phone || !email || !gender || !pin) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' })
  }

  const normalizedPin = String(pin).trim()
  if (!/^\d{4}$/.test(normalizedPin)) {
    return res.status(400).json({ message: 'El PIN debe ser de 4 dígitos' })
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id, phone, email')
    .or(`phone.eq.${phone},email.eq.${email}`)
    .maybeSingle()

  if (existingError) {
    console.error('Register existing check error:', existingError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  if (existing) {
    if (existing.phone === phone) return res.status(400).json({ message: 'El teléfono ya está registrado' })
    if (existing.email === email) return res.status(400).json({ message: 'El correo ya está registrado' })
  }

  let passwordHash
  try {
    passwordHash = await bcrypt.hash(normalizedPin, 10)
  } catch (e) {
    console.error('Register code hash error:', e)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  const { data: maxMemberData, error: maxMemberError } = await supabase
    .from('users')
    .select('member_number')
    .eq('role', 'member')
    .order('member_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxMemberError) {
    console.error('Register member_number error:', maxMemberError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  const maxMemberNumber = parseInt(String(maxMemberData?.member_number ?? '0'), 10)
  const nextMemberNumber = (Number.isFinite(maxMemberNumber) ? maxMemberNumber : 0) + 1

  const { error: insertError } = await supabase
    .from('users')
    .insert([{
      name,
      phone,
      email,
      gender,
      member_number: nextMemberNumber,
      role: 'member',
      password_hash: passwordHash,
      is_verified: true,
      verification_token: null
    }])

  if (insertError) {
    console.error('Register insert error:', insertError)
    return res.status(400).json({ message: 'No se pudo completar el registro' })
  }

  res.status(201).json({ message: 'Registro exitoso. Ya puedes iniciar sesión.' })
}

export async function verifyEmail(req, res) {
  res.status(410).json({ message: 'La verificación por correo está deshabilitada' })
}

export async function login(req, res) {
  const { phone, password } = req.body
  if (!phone) return res.status(400).json({ message: 'Teléfono requerido' })
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, member_number, role, password_hash, is_verified')
    .eq('phone', phone)
    .maybeSingle()
  if (error) {
    console.error('Login Supabase error:', error);
    return res.status(500).json({ message: 'Error de servidor', error });
  }
  if (!data) return res.status(401).json({ message: 'Usuario no registrado' })

  if (!password) return res.status(400).json({ message: 'Contraseña requerida' })
  if (!data.password_hash) return res.status(400).json({ message: 'Usuario sin contraseña configurada' })
  const ok = await bcrypt.compare(String(password), data.password_hash)
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' })

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
    .select('id, name, phone, email, member_number, role')
    .eq('id', id)
    .maybeSingle()
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  if (!data) return res.status(404).json({ message: 'Usuario no encontrado' })
  res.json({ user: data })
}

export async function requestPasswordReset(req, res) {
  res.status(410).json({ message: 'La recuperación de contraseña por correo está deshabilitada' })
}

export async function resetPassword(req, res) {
  res.status(410).json({ message: 'La recuperación de contraseña por correo está deshabilitada' })
}
