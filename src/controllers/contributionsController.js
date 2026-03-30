import { supabase } from '../config/supabase.js'

function toInt(v) {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? undefined : n
}

export async function getContributions(req, res) {
  const requestedUserId = req.query.userId
  const isAdmin = req.user?.role === 'admin'
  if (requestedUserId && !isAdmin && requestedUserId !== req.user.id) {
    return res.status(403).json({ message: 'Acceso restringido' })
  }
  const userId = requestedUserId || req.user.id
  const month = toInt(req.query.month)
  const period = toInt(req.query.period)
  let query = supabase
    .from('contributions')
    .select('id, user_id, month, period, date, amount, status, payment_reference')
    .order('date', { ascending: false })
  if (!isAdmin || requestedUserId) query = query.eq('user_id', userId)
  if (month) query = query.eq('month', month)
  if (period) query = query.eq('period', period)
  const { data, error } = await query
  if (error) {
    console.error('getContributions error:', error)
    return res.status(500).json({ message: 'Error de servidor', error })
  }
  res.json({ contributions: data || [] })
}

export async function createContribution(req, res) {
  const { userId, month, period, date, amount } = req.body
  if (!userId || !month || !period || !date || amount == null) return res.status(400).json({ message: 'Datos incompletos' })
  if (period !== 1 && period !== 2) return res.status(400).json({ message: 'Quincena inválida' })

  const year = toInt(String(date).slice(0, 4))
  if (!year) return res.status(400).json({ message: 'Fecha inválida' })
  const start = `${year}-01-01`
  const end = `${year}-12-31`

  const { data: existing, error: existingError } = await supabase
    .from('contributions')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('period', period)
    .gte('date', start)
    .lte('date', end)
    .maybeSingle()
  if (existingError) {
    console.error('createContribution existing check error:', existingError)
    return res.status(500).json({ message: 'Error de servidor' })
  }
  if (existing) return res.status(400).json({ message: 'Ya existe un abono para esa quincena' })

  const { data, error } = await supabase
    .from('contributions')
    .insert([{ user_id: userId, month, period, date, amount }])
    .select('id, user_id, month, period, date, amount, status, payment_reference')
    .maybeSingle()
  if (error) {
    console.error('createContribution error:', error)
    return res.status(400).json({ message: 'No se pudo crear el aporte' })
  }
  res.status(201).json({ contribution: data })
}

export async function updateContribution(req, res) {
  const id = req.params.id
  const { month, period, date, amount } = req.body
  const updates = {}
  if (month != null) updates.month = month
  if (period != null) updates.period = period
  if (date != null) updates.date = date
  if (amount != null) updates.amount = amount

  if (updates.period != null && updates.period !== 1 && updates.period !== 2) {
    return res.status(400).json({ message: 'Quincena inválida' })
  }

  const { data: current, error: currentError } = await supabase
    .from('contributions')
    .select('id, user_id, month, period, date')
    .eq('id', id)
    .maybeSingle()
  if (currentError) return res.status(500).json({ message: 'Error de servidor' })
  if (!current) return res.status(404).json({ message: 'Aporte no encontrado' })

  const newMonth = updates.month ?? current.month
  const newPeriod = updates.period ?? current.period
  const newDate = updates.date ?? current.date
  const year = toInt(String(newDate).slice(0, 4))
  if (!year) return res.status(400).json({ message: 'Fecha inválida' })
  const start = `${year}-01-01`
  const end = `${year}-12-31`

  const { data: existing, error: existingError } = await supabase
    .from('contributions')
    .select('id')
    .eq('user_id', current.user_id)
    .eq('month', newMonth)
    .eq('period', newPeriod)
    .gte('date', start)
    .lte('date', end)
    .neq('id', id)
    .maybeSingle()
  if (existingError) return res.status(500).json({ message: 'Error de servidor' })
  if (existing) return res.status(400).json({ message: 'Ya existe un abono para esa quincena' })

  const { data, error } = await supabase
    .from('contributions')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, month, period, date, amount, status, payment_reference')
    .maybeSingle()
  if (error) return res.status(400).json({ message: 'No se pudo actualizar el aporte' })
  res.json({ contribution: data })
}

export async function deleteContribution(req, res) {
  const id = req.params.id
  const { error } = await supabase.from('contributions').delete().eq('id', id)
  if (error) return res.status(400).json({ message: 'No se pudo eliminar el aporte' })
  res.status(204).send()
}

export async function requestContribution(req, res) {
  const { month, period, date, amount, payment_reference } = req.body
  const userId = req.user.id
  if (!month || !period || !date || amount == null || !payment_reference) {
    return res.status(400).json({ message: 'Datos incompletos, asegúrese de incluir el comprobante o referencia' })
  }
  if (period !== 1 && period !== 2) return res.status(400).json({ message: 'Quincena inválida' })

  const year = toInt(String(date).slice(0, 4))
  if (!year) return res.status(400).json({ message: 'Fecha inválida' })
  const start = `${year}-01-01`
  const end = `${year}-12-31`

  const { data: existing, error: existingError } = await supabase
    .from('contributions')
    .select('id')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('period', period)
    .gte('date', start)
    .lte('date', end)
    .maybeSingle()

  if (existingError) return res.status(500).json({ message: 'Error de servidor' })
  if (existing) return res.status(400).json({ message: 'Ya existe un abono para esa quincena en este año' })

  const { data, error } = await supabase
    .from('contributions')
    .insert([{ user_id: userId, month, period, date, amount, status: 'pending', payment_reference }])
    .select('id, user_id, month, period, date, amount, status, payment_reference')
    .maybeSingle()

  if (error) {
    console.error('requestContribution error:', error)
    return res.status(400).json({ message: 'No se pudo registrar el abono pendiente' })
  }
  res.status(201).json({ contribution: data })
}

export async function getPendingContributions(req, res) {
  const { data, error } = await supabase
    .from('contributions')
    .select('id, user_id, month, period, date, amount, status, payment_reference, users ( name, phone )')
    .eq('status', 'pending')
    .order('date', { ascending: false })
  if (error) {
    console.error('getPendingContributions error:', error)
    return res.status(500).json({ message: 'Error de servidor' })
  }
  res.json({ contributions: data || [] })
}

export async function reviewContribution(req, res) {
  const id = req.params.id
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Estado inválido' })
  }

  const { data, error } = await supabase
    .from('contributions')
    .update({ status })
    .eq('id', id)
    .select('id, user_id, month, period, date, amount, status, payment_reference')
    .maybeSingle()

  if (error) return res.status(400).json({ message: 'No se pudo actualizar el estado del abono' })
  if (!data) return res.status(404).json({ message: 'Abono no encontrado' })

  res.json({ contribution: data })
}
