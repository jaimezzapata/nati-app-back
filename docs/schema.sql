-- Eliminar tablas si existen para recrearlas correctamente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nota: member_number es BIGINT para evitar errores cuando se usan valores grandes (ej. números de teléfono)

DROP TABLE IF EXISTS public.contributions;
DROP TABLE IF EXISTS public.loans;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.pending_registrations;
DROP TABLE IF EXISTS public.users;

-- Crear tabla de usuarios
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  gender TEXT CHECK (gender IN ('M', 'F', 'Otro')),
  member_number BIGINT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  CONSTRAINT users_member_requires_email CHECK (role <> 'member' OR email IS NOT NULL),
  CONSTRAINT users_member_requires_gender CHECK (role <> 'member' OR gender IS NOT NULL)
);

CREATE TABLE public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'Otro')),
  password_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear tabla de aportes con la relación (foreign key)
CREATE TABLE public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  period INTEGER NOT NULL CHECK (period IN (1, 2)),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_reference TEXT
);

CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  loan_interest_percent NUMERIC NOT NULL DEFAULT 5,
  loan_max_percent_of_savings NUMERIC NOT NULL DEFAULT 70,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_amount NUMERIC NOT NULL CHECK (requested_amount > 0),
  interest_percent NUMERIC NOT NULL CHECK (interest_percent >= 0),
  interest_amount NUMERIC NOT NULL CHECK (interest_amount >= 0),
  total_due NUMERIC NOT NULL CHECK (total_due >= 0),
  max_percent_of_savings NUMERIC NOT NULL CHECK (max_percent_of_savings >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'closed')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Habilitar RLS (Row Level Security) - Opcional si usas service_role key,
-- pero recomendado por Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todo (ya que el backend controla la lógica con el service_role key)
CREATE POLICY "Permitir todo a usuarios" ON public.users FOR ALL USING (true);
CREATE POLICY "Permitir todo a pending_registrations" ON public.pending_registrations FOR ALL USING (true);
CREATE POLICY "Permitir todo a aportes" ON public.contributions FOR ALL USING (true);
CREATE POLICY "Permitir todo a settings" ON public.settings FOR ALL USING (true);
CREATE POLICY "Permitir todo a loans" ON public.loans FOR ALL USING (true);

INSERT INTO public.settings (id, loan_interest_percent, loan_max_percent_of_savings) VALUES (1, 5, 70);

INSERT INTO public.users (id, name, phone, email, gender, member_number, role, password_hash, is_verified) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin', '3000000000', NULL, NULL, 1, 'admin', crypt('admin123', gen_salt('bf')), TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Miembro 1', '3000000001', 'miembro1@demo.com', 'M', 2, 'member', crypt('1234', gen_salt('bf')), TRUE),
  ('33333333-3333-3333-3333-333333333333', 'Miembro 2', '3000000002', 'miembro2@demo.com', 'F', 3, 'member', crypt('1234', gen_salt('bf')), TRUE);

INSERT INTO public.contributions (user_id, month, period, date, amount) VALUES
  ('22222222-2222-2222-2222-222222222222', 1, 1, '2026-01-05', 50000),
  ('22222222-2222-2222-2222-222222222222', 1, 2, '2026-01-20', 50000),
  ('33333333-3333-3333-3333-333333333333', 1, 1, '2026-01-06', 50000);
