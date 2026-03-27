import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false
  }
})

