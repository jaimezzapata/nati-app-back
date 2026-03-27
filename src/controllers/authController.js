import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { supabase } from '../config/supabase.js'

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: String(process.env.SMTP_PORT) === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(input) {
  const b64 = String(input).replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return Buffer.from(b64 + pad, 'base64')
}

function getRegistrationKey() {
  const secret = process.env.REGISTRATION_SECRET || process.env.JWT_SECRET
  if (!secret) return null
  return crypto.createHash('sha256').update(secret).digest()
}

function createRegistrationToken(payload) {
  const key = getRegistrationKey()
  if (!key) throw new Error('Missing registration secret')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload))
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${base64UrlEncode(iv)}.${base64UrlEncode(tag)}.${base64UrlEncode(encrypted)}`
}

function parseRegistrationToken(token) {
  const key = getRegistrationKey()
  if (!key) return null
  const parts = String(token).split('.')
  if (parts.length !== 3) return null
  try {
    const iv = base64UrlDecode(parts[0])
    const tag = base64UrlDecode(parts[1])
    const encrypted = base64UrlDecode(parts[2])
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return JSON.parse(decrypted.toString('utf8'))
  } catch {
    return null
  }
}

export async function register(req, res) {
  const { name, phone, email, gender } = req.body
  if (!name || !phone || !email || !gender) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' })
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

  const missing = []
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS')
  if (!process.env.FRONTEND_URL) missing.push('FRONTEND_URL')
  if (missing.length) {
    console.warn('Registro bloqueado por configuración faltante:', {
      missing,
      hasSmtpHost: Boolean(process.env.SMTP_HOST),
      smtpPort: process.env.SMTP_PORT
    })
    return res.status(500).json({
      message: 'El servidor no tiene configurado el envío de correos',
      missing
    })
  }

  let registrationToken
  try {
    const now = Date.now()
    registrationToken = createRegistrationToken({
      name,
      phone,
      email,
      gender,
      iat: now,
      exp: now + 1000 * 60 * 60 * 24
    })
  } catch (e) {
    console.error('Register token error:', e)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${encodeURIComponent(registrationToken)}`
  try {
    await transporter.sendMail({
      from: `"Natillera" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Confirma tu cuenta en Natillera',
      html: `
        <h2>¡Hola ${name}!</h2>
        <p>Gracias por registrarte en Natillera. Para activar tu cuenta y poder ingresar, haz clic en el siguiente enlace:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background-color:#d980f8;color:white;text-decoration:none;border-radius:5px;">Confirmar mi cuenta</a>
        <p>Si no fuiste tú, ignora este mensaje.</p>
      `
    })
    res.status(201).json({ message: 'Revisa tu correo para confirmar tu cuenta.' })
  } catch (mailError) {
    console.error('Error enviando email:', mailError)
    res.status(500).json({ message: 'No se pudo enviar el correo de confirmación' })
  }
}

export async function verifyEmail(req, res) {
  const { token } = req.body
  if (!token) return res.status(400).json({ message: 'Token requerido' })

  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('verification_token', token)
    .maybeSingle()

  if (findError) {
    console.error('Verify find error:', findError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  if (user) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_verified: true, verification_token: null })
      .eq('id', user.id)

    if (updateError) {
      return res.status(500).json({ message: 'Error al verificar la cuenta' })
    }

    return res.json({ message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' })
  }

  const payload = parseRegistrationToken(token)
  if (!payload) return res.status(400).json({ message: 'Token inválido o expirado' })

  const now = Date.now()
  if (payload.exp && now > payload.exp) return res.status(400).json({ message: 'Token inválido o expirado' })

  const { name, phone, email, gender } = payload
  if (!name || !phone || !email || !gender) return res.status(400).json({ message: 'Token inválido o expirado' })

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id, phone, email')
    .or(`phone.eq.${phone},email.eq.${email}`)
    .maybeSingle()

  if (existingError) {
    console.error('Verify existing check error:', existingError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  if (existing) {
    return res.status(400).json({ message: 'El usuario ya está registrado' })
  }

  const { data: maxMemberData, error: maxMemberError } = await supabase
    .from('users')
    .select('member_number')
    .order('member_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxMemberError) {
    console.error('Verify member_number error:', maxMemberError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  const nextMemberNumber = (maxMemberData?.member_number || 0) + 1

  const { error: insertError } = await supabase
    .from('users')
    .insert([{
      name,
      phone,
      email,
      gender,
      member_number: nextMemberNumber,
      role: 'member',
      is_verified: true,
      verification_token: null
    }])

  if (insertError) {
    console.error('Verify insert error:', insertError)
    return res.status(400).json({ message: 'Error al completar el registro' })
  }

  res.json({ message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' })
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

  if (data.role === 'member' && !data.is_verified) {
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
