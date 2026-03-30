import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: String(process.env.SMTP_PORT) === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY no configurada')

  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

async function sendWithSmtp({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP_USER/SMTP_PASS no configuradas')
  }
  await transporter.sendMail({
    from: `"Natillera" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  })
}

export async function sendEmail({ to, subject, html }) {
  if (process.env.RESEND_API_KEY) return sendWithResend({ to, subject, html })
  return sendWithSmtp({ to, subject, html })
}

