import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { supabase } from '../config/supabase.js'

// Configuración de Nodemailer (usa variables de entorno o ethereal para pruebas)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export async function register(req, res) {
  const { name, phone, email, gender } = req.body
  if (!name || !phone || !email || !gender) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' })
  }

  // Verificar si ya existe el teléfono o email
  const { data: existing } = await supabase
    .from('users')
    .select('id, phone, email')
    .or(`phone.eq.${phone},email.eq.${email}`)
    .maybeSingle()

  if (existing) {
    if (existing.phone === phone) return res.status(400).json({ message: 'El teléfono ya está registrado' })
    if (existing.email === email) return res.status(400).json({ message: 'El correo ya está registrado' })
  }

  // Obtener el siguiente member_number
  const { data: maxMemberData } = await supabase
    .from('users')
    .select('member_number')
    .order('member_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  const nextMemberNumber = (maxMemberData?.member_number || 0) + 1

  // Generar token de verificación
  const verificationToken = crypto.randomBytes(32).toString('hex')

  // Crear usuario
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{
      name,
      phone,
      email,
      gender,
      member_number: nextMemberNumber,
      role: 'member',
      is_verified: false,
      verification_token: verificationToken
    }])
    .select('id, name, email')
    .maybeSingle()

  if (error) {
    console.error('Register error:', error)
    return res.status(500).json({ message: 'Error al registrar el usuario' })
  }

  // Enviar correo
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${verificationToken}`
  try {
    await transporter.sendMail({
      from: '"Natillera" <noreply@natillera.com>',
      to: email,
      subject: 'Confirma tu cuenta en Natillera',
      html: `
        <h2>¡Hola ${name}!</h2>
        <p>Gracias por registrarte en Natillera. Para activar tu cuenta y poder ingresar, haz clic en el siguiente enlace:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background-color:#d980f8;color:white;text-decoration:none;border-radius:5px;">Confirmar mi cuenta</a>
        <p>Si no fuiste tú, ignora este mensaje.</p>
      `
    })
    console.log(`Email de verificación enviado a ${email} - Token: ${verificationToken}`)
  } catch (mailError) {
    console.error('Error enviando email:', mailError)
    // No bloqueamos el registro si el correo falla en dev, pero en prod sí deberíamos considerarlo
  }

  res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.' })
}

export async function verifyEmail(req, res) {
  const { token } = req.body
  if (!token) return res.status(400).json({ message: 'Token requerido' })

  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('verification_token', token)
    .maybeSingle()

  if (findError || !user) {
    return res.status(400).json({ message: 'Token inválido o expirado' })
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ is_verified: true, verification_token: null })
    .eq('id', user.id)

  if (updateError) {
    return res.status(500).json({ message: 'Error al verificar la cuenta' })
  }

  res.json({ message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' })
}

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

  if (!data.is_verified) {
    return res.status(403).json({ message: 'Debes verificar tu correo electrónico antes de iniciar sesión' })
  }

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
