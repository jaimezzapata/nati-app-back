# Prompt (proyecto existente) — Natillera

Copia y pega este prompt en cualquier IA para continuar el desarrollo de la app existente sin perder contexto.

```text
Actúa como un desarrollador senior full‑stack. Estoy construyendo una app llamada Natillera (ahorro familiar) con Frontend en React + Vite + Tailwind, y Backend en Node.js + Express, conectada a Supabase (Postgres). La app debe ser moderna, responsiva y con UX/UI profesional.

1) Objetivo general
Construimos una app para gestionar una natillera familiar con:
- Un dashboard de admin (panel profesional con métricas, gráficas, accesos rápidos).
- Gestión de usuarios, abonos (aportes) y reportes.
- Flujo de autenticación diferenciado: admin protegido con contraseña, socios con acceso más directo.

2) Autenticación y roles
- Roles: admin y member.
- Admin inicia sesión con celular + contraseña.
- Los socios inician sesión con celular, pero si provienen de auto‑registro, deben estar verificados.
- En el login, si el teléfono ingresado coincide con VITE_ADMIN_PHONE, se muestra automáticamente el campo de contraseña.

3) Registro con verificación por código (auto‑registro)
- Auto‑registro solicita: nombre, teléfono, correo, género.
- Se envía un código de 6 dígitos por correo (no enlace).
- Mientras no se confirme el código, NO se crea el usuario en users.
- Se guarda un registro temporal en pending_registrations con expires_at (expira en 15 minutos) y code_hash (hash del código).
- /verify recibe correo/teléfono + código; si valida, inserta definitivamente en users como member con is_verified=true.
- UX: después de registrarse, redirige a /verify con correo precargado y bloqueado, y foco directo al input del código.

4) Registro desde Admin (sin verificación)
- El admin puede crear usuarios desde el panel sin verificación por correo.
- Si crea un member, debe ingresar correo y género, y el usuario queda verificado automáticamente.
- Si crea un admin, la contraseña es obligatoria.

5) Abonos / aportes
- Los abonos distinguen 2 periodos por mes (period = 1 o 2).

6) Dashboard Admin
- KPIs + gráficas (Recharts).
- Sección informativa de registros pendientes: consulta pending_registrations y muestra nombre/correo/expiración.
- Si no hay pendientes, el panel igual aparece con mensaje “No hay registros pendientes de validación”.

7) UX/UI
- Diseño pastel rosado/morado.
- Responsive completo con sidebar/hamburguesa en móvil.
- Tarjetas con animaciones suaves, skeleton shimmer, transiciones.
- Alertas y toasts con estética acorde.

8) Backend
- Express con CORS configurado.
- SMTP configurado con nodemailer para correos.
- Variables de entorno críticas: JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS, FRONTEND_URL.

9) Base de datos (Supabase/Postgres)
- users: role, password_hash, is_verified, email, gender, member_number (BIGINT).
- pending_registrations: name, phone, email, gender, code_hash, expires_at, created_at.
- contributions: month, period (1/2), date, amount.
- Constraints: admin requiere password_hash; member requiere email y gender.

10) Lo que necesito de ti
Continúa el desarrollo sin romper estos flujos, manteniendo UX/UI profesional y consistente. Prioriza: seguridad, validación de datos, manejo de errores, y consistencia visual.
```

