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

function generateVerificationCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0')
}

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

  const missing = []
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS')
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

  const code = generateVerificationCode()
  let codeHash
  let passwordHash
  try {
    codeHash = await bcrypt.hash(code, 10)
    passwordHash = await bcrypt.hash(normalizedPin, 10)
  } catch (e) {
    console.error('Register code hash error:', e)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString()

  // Eliminar cualquier intento de registro previo con el mismo teléfono o correo
  // para evitar conflictos con las restricciones UNIQUE de la tabla
  await supabase
    .from('pending_registrations')
    .delete()
    .or(`phone.eq.${phone},email.eq.${email}`)

  const { error: pendingInsertError } = await supabase
    .from('pending_registrations')
    .insert([{
      name,
      phone,
      email,
      gender,
      password_hash: passwordHash,
      code_hash: codeHash,
      expires_at: expiresAt
    }])

  if (pendingInsertError) {
    console.error('Pending registration insert error:', pendingInsertError)
    return res.status(400).json({ message: 'No se pudo iniciar el registro. Intenta de nuevo.' })
  }

  const appUrl = process.env.FRONTEND_URL ? `<p>Ingresa a <strong>${process.env.FRONTEND_URL}</strong> y confirma tu registro.</p>` : ''
  try {
    await transporter.sendMail({
      from: `"Natillera" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Código de confirmación - Natillera',
      html: `
        <h2>¡Hola ${name}!</h2>
        <p>Gracias por registrarte en Natillera. Usa este código para confirmar tu cuenta:</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;padding:12px 16px;background:#f3e8ff;border-radius:10px;display:inline-block">${code}</div>
        <p style="margin-top:16px">Este código vence en <strong>15 minutos</strong>.</p>
        ${appUrl}
        <p>Si no fuiste tú, ignora este mensaje.</p>
      `
    })
    res.status(201).json({ message: 'Revisa tu correo e ingresa el código para confirmar tu cuenta.' })
  } catch (mailError) {
    console.error('Error enviando email:', mailError)
    await supabase
      .from('pending_registrations')
      .delete()
      .or(`phone.eq.${phone},email.eq.${email}`)
    res.status(500).json({ message: 'No se pudo enviar el correo de confirmación' })
  }
}

export async function verifyEmail(req, res) {
  const { identifier, code } = req.body
  if (!identifier || !code) return res.status(400).json({ message: 'Correo o teléfono y código requeridos' })

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id, phone, email')
    .or(`phone.eq.${identifier},email.eq.${identifier}`)
    .maybeSingle()

  if (existingError) {
    console.error('Verify existing check error:', existingError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  if (existing) {
    return res.status(400).json({ message: 'El usuario ya está registrado' })
  }

  const { data: pending, error: pendingError } = await supabase
    .from('pending_registrations')
    .select('id, name, phone, email, gender, password_hash, code_hash, expires_at')
    .or(`phone.eq.${identifier},email.eq.${identifier}`)
    .maybeSingle()

  if (pendingError) {
    console.error('Verify pending lookup error:', pendingError)
    return res.status(500).json({ message: 'Error de servidor' })
  }

  if (!pending) return res.status(400).json({ message: 'Código inválido o expirado' })

  if (pending.expires_at && Date.now() > new Date(pending.expires_at).getTime()) {
    await supabase.from('pending_registrations').delete().eq('id', pending.id)
    return res.status(400).json({ message: 'Código inválido o expirado' })
  }

  const ok = await bcrypt.compare(String(code), pending.code_hash)
  if (!ok) return res.status(400).json({ message: 'Código inválido o expirado' })

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

  const maxMemberNumber = parseInt(String(maxMemberData?.member_number ?? '0'), 10)
  const nextMemberNumber = (Number.isFinite(maxMemberNumber) ? maxMemberNumber : 0) + 1

  const { error: insertError } = await supabase
    .from('users')
    .insert([{
      name: pending.name,
      phone: pending.phone,
      email: pending.email,
      gender: pending.gender,
      member_number: nextMemberNumber,
      role: 'member',
      password_hash: pending.password_hash,
      is_verified: true,
      verification_token: null
    }])

  if (insertError) {
    console.error('Verify insert error:', insertError)
    return res.status(400).json({ message: 'Error al completar el registro' })
  }

  await supabase.from('pending_registrations').delete().eq('id', pending.id)
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
  const { phone } = req.body
  if (!phone) return res.status(400).json({ message: 'Teléfono requerido' })

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('phone', phone)
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Error de servidor' })
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
  if (!user.email) return res.status(400).json({ message: 'El usuario no tiene un correo electrónico configurado para recuperar la contraseña' })

  const missing = []
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS')
  if (missing.length) return res.status(500).json({ message: 'El servidor no tiene configurado el envío de correos' })

  const code = generateVerificationCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString()

  // Reusamos la tabla pending_registrations para guardar el código temporal
  await supabase.from('pending_registrations').delete().eq('phone', phone)
  
  const { error: insertError } = await supabase
    .from('pending_registrations')
    .insert([{
      name: user.name,
      phone: phone,
      email: user.email,
      code_hash: codeHash,
      expires_at: expiresAt,
      gender: 'N/A', // Campo requerido en la tabla pero no usado para reset
      password_hash: 'reset' // Campo requerido pero no usado aquí
    }])

  if (insertError) {
    console.error('Password reset insert error:', insertError)
    return res.status(500).json({ message: 'Error al generar código de recuperación' })
  }

  try {
    await transporter.sendMail({
      from: `"Natillera" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Recuperación de contraseña - Natillera',
      html: `
        <h2>¡Hola ${user.name}!</h2>
        <p>Has solicitado recuperar tu contraseña. Usa este código para continuar:</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:700;padding:12px 16px;background:#f3e8ff;border-radius:10px;display:inline-block">${code}</div>
        <p style="margin-top:16px">Este código vence en <strong>15 minutos</strong>.</p>
        <p>Si no solicitaste esto, ignora este mensaje y tu contraseña seguirá siendo la misma.</p>
      `
    })
    res.json({ message: 'Código de recuperación enviado a tu correo' })
  } catch (mailError) {
    console.error('Error enviando email de recuperación:', mailError)
    res.status(500).json({ message: 'No se pudo enviar el correo' })
  }
}

export async function resetPassword(req, res) {
  const { phone, code, newPassword } = req.body
  if (!phone || !code || !newPassword) return res.status(400).json({ message: 'Teléfono, código y nueva contraseña son requeridos' })

  const { data: pending, error: pendingError } = await supabase
    .from('pending_registrations')
    .select('id, code_hash, expires_at')
    .eq('phone', phone)
    .maybeSingle()

  if (pendingError || !pending) return res.status(400).json({ message: 'Código inválido o expirado' })
  if (pending.expires_at && Date.now() > new Date(pending.expires_at).getTime()) {
    await supabase.from('pending_registrations').delete().eq('id', pending.id)
    return res.status(400).json({ message: 'Código inválido o expirado' })
  }

  const ok = await bcrypt.compare(String(code), pending.code_hash)
  if (!ok) return res.status(400).json({ message: 'Código inválido o expirado' })

  const { data: user } = await supabase.from('users').select('role').eq('phone', phone).maybeSingle()
  if (user && user.role === 'member' && !/^\d{4}$/.test(String(newPassword).trim())) {
    return res.status(400).json({ message: 'El PIN debe ser de 4 dígitos' })
  }

  const passwordHash = await bcrypt.hash(String(newPassword).trim(), 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('phone', phone)

  if (updateError) return res.status(500).json({ message: 'Error al actualizar la contraseña' })

  await supabase.from('pending_registrations').delete().eq('id', pending.id)
  res.json({ message: 'Contraseña actualizada exitosamente' })
}
