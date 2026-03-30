import { supabase } from '../config/supabase.js'

function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function getCycleRange() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const startYear = now.getMonth() === 11 ? currentYear : currentYear - 1
  const start = `${startYear}-12-01`
  const end = `${startYear + 1}-11-30`
  return { startYear, endYear: startYear + 1, start, end }
}

async function readLoanSettings() {
  const { data } = await supabase
    .from('settings')
    .select('loan_interest_percent, loan_max_percent_of_savings')
    .eq('id', 1)
    .maybeSingle()
  return {
    loan_interest_percent: Number(data?.loan_interest_percent ?? 5),
    loan_max_percent_of_savings: Number(data?.loan_max_percent_of_savings ?? 70)
  }
}

async function approvedSavingsInCycle(userId) {
  const cycle = getCycleRange()
  const { data, error } = await supabase
    .from('contributions')
    .select('amount, status')
    .eq('user_id', userId)
    .gte('date', cycle.start)
    .lte('date', cycle.end)

  if (error) throw new Error('No se pudo calcular el ahorro')

  return (data || [])
    .filter(c => !c.status || c.status === 'approved')
    .reduce((s, c) => s + Number(c.amount || 0), 0)
}

export async function getLoans(req, res) {
  const requestedUserId = req.query.userId
  const isAdmin = req.user?.role === 'admin'
  if (requestedUserId && !isAdmin && requestedUserId !== req.user.id) {
    return res.status(403).json({ message: 'Acceso restringido' })
  }

  let query = supabase
    .from('loans')
    .select('id, user_id, requested_amount, interest_percent, interest_amount, total_due, max_percent_of_savings, status, reason, created_at, reviewed_at, reviewed_by, users!loans_user_id_fkey ( name, phone )')
    .order('created_at', { ascending: false })

  if (!isAdmin || requestedUserId) query = query.eq('user_id', requestedUserId || req.user.id)

  const { data, error } = await query
  if (error) return res.status(500).json({ message: 'Error de servidor' })
  res.json({ loans: data || [] })
}

export async function getPendingLoans(req, res) {
  const { data, error } = await supabase
    .from('loans')
    .select('id, user_id, requested_amount, interest_percent, interest_amount, total_due, max_percent_of_savings, status, reason, created_at, users!loans_user_id_fkey ( name, phone )')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('getPendingLoans error:', error)
    return res.status(500).json({ message: 'Error de servidor' })
  }
  res.json({ loans: data || [] })
}

export async function requestLoan(req, res) {
  const amount = toNumber(req.body.amount)
  const reason = (req.body.reason || '').trim() || null
  if (amount == null || amount <= 0) return res.status(400).json({ message: 'Monto inválido' })

  const userId = req.user.id

  const { data: existingActive, error: existingError } = await supabase
    .from('loans')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existingError) return res.status(500).json({ message: 'Error de servidor' })
  if (existingActive) return res.status(400).json({ message: 'Ya tienes un préstamo activo o pendiente' })

  let settings
  let savings
  try {
    settings = await readLoanSettings()
    savings = await approvedSavingsInCycle(userId)
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Error de servidor' })
  }

  const maxAllowed = (savings * settings.loan_max_percent_of_savings) / 100
  if (amount > maxAllowed) {
    return res.status(400).json({
      message: `El monto supera el tope permitido. Máximo: ${Math.floor(maxAllowed)}`
    })
  }

  const interest_amount = (amount * settings.loan_interest_percent) / 100
  const total_due = amount + interest_amount

  const { data, error } = await supabase
    .from('loans')
    .insert([{
      user_id: userId,
      requested_amount: amount,
      interest_percent: settings.loan_interest_percent,
      interest_amount,
      total_due,
      max_percent_of_savings: settings.loan_max_percent_of_savings,
      status: 'pending',
      reason
    }])
    .select('id, user_id, requested_amount, interest_percent, interest_amount, total_due, max_percent_of_savings, status, reason, created_at')
    .maybeSingle()

  if (error) return res.status(400).json({ message: 'No se pudo registrar la solicitud' })
  res.status(201).json({ loan: data })
}

export async function reviewLoan(req, res) {
  const id = req.params.id
  const status = String(req.body.status || '')
  if (!['approved', 'rejected', 'closed'].includes(status)) return res.status(400).json({ message: 'Estado inválido' })

  const { data: current, error: currentError } = await supabase
    .from('loans')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (currentError) return res.status(500).json({ message: 'Error de servidor' })
  if (!current) return res.status(404).json({ message: 'Préstamo no encontrado' })

  if (current.status === 'rejected' && status !== 'rejected') return res.status(400).json({ message: 'No se puede cambiar un préstamo rechazado' })

  const { data, error } = await supabase
    .from('loans')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user.id
    })
    .eq('id', id)
    .select('id, user_id, requested_amount, interest_percent, interest_amount, total_due, max_percent_of_savings, status, reason, created_at, reviewed_at, reviewed_by')
    .maybeSingle()

  if (error) return res.status(400).json({ message: 'No se pudo actualizar el préstamo' })
  res.json({ loan: data })
}

export async function getLoanEligibility(req, res) {
  const userId = req.user.id
  let settings
  let savings
  try {
    settings = await readLoanSettings()
    savings = await approvedSavingsInCycle(userId)
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Error de servidor' })
  }

  const maxAllowed = (savings * settings.loan_max_percent_of_savings) / 100

  const { data: existingActive } = await supabase
    .from('loans')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])

  res.json({
    eligibility: {
      savings,
      interest_percent: settings.loan_interest_percent,
      max_percent_of_savings: settings.loan_max_percent_of_savings,
      max_allowed: maxAllowed,
      has_active_loan: (existingActive || []).length > 0
    }
  })
}
