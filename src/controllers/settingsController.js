import { supabase } from '../config/supabase.js'

function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function getLoanSettings(req, res) {
  const { data, error } = await supabase
    .from('settings')
    .select('loan_interest_percent, loan_max_percent_of_savings, updated_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Error de servidor' })

  if (!data) {
    const defaults = { loan_interest_percent: 5, loan_max_percent_of_savings: 70 }
    const { data: created, error: createError } = await supabase
      .from('settings')
      .insert([{ id: 1, ...defaults }])
      .select('loan_interest_percent, loan_max_percent_of_savings, updated_at')
      .maybeSingle()
    if (createError) return res.status(500).json({ message: 'Error de servidor' })
    return res.json({ settings: created })
  }

  res.json({ settings: data })
}

export async function updateLoanSettings(req, res) {
  const loan_interest_percent = toNumber(req.body.loan_interest_percent)
  const loan_max_percent_of_savings = toNumber(req.body.loan_max_percent_of_savings)

  if (loan_interest_percent == null && loan_max_percent_of_savings == null) {
    return res.status(400).json({ message: 'Datos incompletos' })
  }
  if (loan_interest_percent != null && loan_interest_percent < 0) {
    return res.status(400).json({ message: 'Interés inválido' })
  }
  if (loan_max_percent_of_savings != null && (loan_max_percent_of_savings < 0 || loan_max_percent_of_savings > 1000)) {
    return res.status(400).json({ message: 'Tope inválido' })
  }

  const updates = { updated_at: new Date().toISOString() }
  if (loan_interest_percent != null) updates.loan_interest_percent = loan_interest_percent
  if (loan_max_percent_of_savings != null) updates.loan_max_percent_of_savings = loan_max_percent_of_savings

  const { data, error } = await supabase
    .from('settings')
    .upsert([{ id: 1, ...updates }], { onConflict: 'id' })
    .select('loan_interest_percent, loan_max_percent_of_savings, updated_at')
    .maybeSingle()

  if (error) return res.status(500).json({ message: 'Error de servidor' })
  res.json({ settings: data })
}

