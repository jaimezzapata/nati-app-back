import { supabase } from '../config/supabase.js'

function toInt(v) {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? undefined : n
}

export async function dashboardMetrics(req, res) {
  const { data: users, error: usersError } = await supabase.from('users').select('id, role')
  if (usersError) return res.status(500).json({ message: 'Error' })

  const { data: contributions, error: contributionsError } = await supabase
    .from('contributions')
    .select('id, month, amount, date')
  if (contributionsError) return res.status(500).json({ message: 'Error' })

  const members = users.filter(u => u.role === 'member').length
  const totalAmount = contributions.reduce((s, c) => s + Number(c.amount || 0), 0)

  // Ingresos por mes (para gráfica de barras)
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }))
  for (const c of contributions) {
    if (c.month >= 1 && c.month <= 12) {
      monthlyData[c.month - 1].total += Number(c.amount || 0)
    }
  }

  // Usuarios al día este mes actual vs en mora
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const start = `${currentYear}-01-01`
  const end = `${currentYear}-12-31`
  
  const { data: currentContributions } = await supabase
    .from('contributions')
    .select('user_id, period')
    .eq('month', currentMonth)
    .gte('date', start)
    .lte('date', end)

  const userPeriods = new Map()
  for (const c of currentContributions || []) {
    if (!userPeriods.has(c.user_id)) userPeriods.set(c.user_id, new Set())
    userPeriods.get(c.user_id).add(c.period)
  }

  let upToDate = 0
  let pending = 0
  for (const u of users.filter(u => u.role === 'member')) {
    if ((userPeriods.get(u.id)?.size || 0) === 2) upToDate++
    else pending++
  }

  res.json({
    metrics: {
      totalMembers: members,
      totalAmount,
      upToDate,
      pending
    },
    monthlyData
  })
}
export async function reportSummary(req, res) {
  const month = toInt(req.query.month)
  const year = toInt(req.query.year)

  if (month != null && (month < 1 || month > 12)) {
    return res.status(400).json({ message: 'Mes inválido' })
  }

  let usersQuery = supabase
    .from('users')
    .select('id, name, phone, member_number, role')
    .order('name')

  const { data: users, error: usersError } = await usersQuery
  if (usersError) return res.status(500).json({ message: 'Error de servidor' })

  let contributionsQuery = supabase
    .from('contributions')
    .select('id, user_id, month, period, date, amount')
    .order('date', { ascending: false })

  if (month != null) contributionsQuery = contributionsQuery.eq('month', month)
  if (year != null) {
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    contributionsQuery = contributionsQuery.gte('date', start).lte('date', end)
  }

  const { data: contributions, error: contributionsError } = await contributionsQuery
  if (contributionsError) return res.status(500).json({ message: 'Error de servidor' })

  const aggByUserId = new Map()
  let grandTotal = 0

  for (const c of contributions || []) {
    const amount = Number(c.amount || 0)
    grandTotal += amount

    if (!aggByUserId.has(c.user_id)) {
      aggByUserId.set(c.user_id, { total: 0, count: 0, lastDate: null, periods: new Set() })
    }
    const agg = aggByUserId.get(c.user_id)
    agg.total += amount
    agg.count += 1
    if (c.period) agg.periods.add(c.period)
    if (!agg.lastDate || new Date(c.date) > new Date(agg.lastDate)) agg.lastDate = c.date
  }

  const rows = (users || []).map(u => {
    const agg = aggByUserId.get(u.id) || { total: 0, count: 0, lastDate: null, periods: new Set() }
    return {
      ...u,
      total: agg.total,
      count: agg.count,
      lastDate: agg.lastDate,
      paid: agg.periods.size === 2, // Se considera pagado el mes si tiene las 2 quincenas
      periodsPaid: Array.from(agg.periods)
    }
  })

  res.json({
    filters: { month: month ?? null, year: year ?? null },
    grandTotal,
    users: rows
  })
}

