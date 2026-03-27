-- Eliminar tablas si existen para recrearlas correctamente
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nota: member_number es BIGINT para evitar errores cuando se usan valores grandes (ej. números de teléfono)

DROP TABLE IF EXISTS public.contributions;
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
  password_hash TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  CONSTRAINT users_admin_password_check CHECK (role <> 'admin' OR password_hash IS NOT NULL),
  CONSTRAINT users_member_requires_email CHECK (role <> 'member' OR email IS NOT NULL),
  CONSTRAINT users_member_requires_gender CHECK (role <> 'member' OR gender IS NOT NULL)
);

CREATE TABLE public.pending_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'Otro')),
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
  amount NUMERIC NOT NULL
);

-- Habilitar RLS (Row Level Security) - Opcional si usas service_role key,
-- pero recomendado por Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir todo (ya que el backend controla la lógica con el service_role key)
CREATE POLICY "Permitir todo a usuarios" ON public.users FOR ALL USING (true);
CREATE POLICY "Permitir todo a pending_registrations" ON public.pending_registrations FOR ALL USING (true);
CREATE POLICY "Permitir todo a aportes" ON public.contributions FOR ALL USING (true);

INSERT INTO public.users (id, name, phone, email, gender, member_number, role, password_hash, is_verified) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Admin', '3000000000', NULL, NULL, 1, 'admin', crypt('admin123', gen_salt('bf')), TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Miembro 1', '3000000001', 'miembro1@demo.com', 'M', 2, 'member', NULL, TRUE),
  ('33333333-3333-3333-3333-333333333333', 'Miembro 2', '3000000002', 'miembro2@demo.com', 'F', 3, 'member', NULL, TRUE);

INSERT INTO public.contributions (user_id, month, period, date, amount) VALUES
  ('22222222-2222-2222-2222-222222222222', 1, 1, '2026-01-05', 50000),
  ('22222222-2222-2222-2222-222222222222', 1, 2, '2026-01-20', 50000),
  ('33333333-3333-3333-3333-333333333333', 1, 1, '2026-01-06', 50000);
