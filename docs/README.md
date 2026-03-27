# Natillera — Backend

API Node.js + Express desacoplada que conecta con Supabase para gestionar usuarios y aportes.

## Requisitos
- Node 18+
- Proyecto Supabase con tablas:
  - `users(id, name, phone unique, member_number, role 'admin'|'member')`
  - `contributions(id, user_id, month 1-12, date, amount)`

## Variables de entorno
Copiar `.env.example` a `.env` y configurar:

```
PORT=4000
JWT_SECRET=change_me
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=http://localhost:5173
```

## Instalación
```bash
npm install
npm run dev
```

## Endpoints
- `POST /auth/login` body: `{ phone }` → devuelve `{ token, user }`
- `GET /auth/me` auth Bearer → `{ user }`
- `GET /users` admin
- `POST /users` admin body: `{ name, phone, memberNumber, role }`
- `GET /contributions?userId=&month=` auth
- `POST /contributions` admin body: `{ userId, month, date, amount }`
- `PUT /contributions/:id` admin
- `DELETE /contributions/:id` admin

## Seguridad
- Autenticación por número de celular sin contraseña.
- Token JWT de corta duración.
- Validar CORS mediante `ALLOWED_ORIGINS`.

