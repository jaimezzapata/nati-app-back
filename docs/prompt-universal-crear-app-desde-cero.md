# Prompt universal (crear app desde cero)

Prompt reusable para pedirle a una IA que construya una app completa desde cero, con enfoque en arquitectura, UX y seguridad.

```text
Actúa como arquitecto + desarrollador senior full‑stack + UX/UI designer. Necesito que construyas una aplicación desde cero y entregues un producto funcional, moderno y escalable.

1) Objetivo del producto
- Nombre: [NOMBRE_APP]
- Problema que resuelve: [PROBLEMA/NECESIDAD]
- Usuarios objetivo: [TIPO DE USUARIO]
- Caso de uso principal: [DESCRIPCIÓN]

2) Requisitos no funcionales (obligatorios)
- UX/UI profesional, consistente y responsive (móvil/tablet/desktop).
- Manejo de estados: loading/empty/error/success, skeletons, feedback claro.
- Seguridad: validación de inputs, permisos por rol, no exponer secretos, rate‑limits básicos si aplica.
- Accesibilidad básica: foco, contraste, teclado, prefers-reduced-motion.
- Código mantenible: estructura clara, naming consistente, reutilización de componentes, pruebas mínimas en puntos críticos.

3) Roles y permisos
- Define roles mínimos: [Admin], [Usuario], [Otros si aplica].
- Reglas: qué puede ver/hacer cada rol.
- Admin con autenticación fuerte (contraseña obligatoria, opción futura 2FA).

4) Autenticación y registro
Implementa una estrategia de auth apropiada para la app:
- Login: [JWT o sesiones] con expiración y refresh si aplica.
- Registro: [con verificación por código o link] según necesidades.
  - Recomendación: verificación por código de un solo uso con expiración.
  - No crear usuario definitivo hasta que confirme (usar tabla/colección pending_registrations).
- Admin: puede crear usuarios desde panel sin verificación (si el negocio lo requiere).

5) Módulos del producto
Define e implementa los módulos:
- Módulo A: [CRUD + validaciones + UX]
- Módulo B: [CRUD + validaciones + UX]
- Módulo C: [reportes/estadísticas/exportación si aplica]

6) Dashboard (si aplica)
Incluye:
- KPI cards.
- Gráficas.
- Accesos rápidos.
- Secciones informativas (ej. pendientes, auditoría, tareas).

7) Base de datos (modelo inicial)
Diseña el modelo con:
- users: id, name, phone/email, role, password_hash, is_verified, created_at
- pending_registrations: identifier, code_hash, expires_at, payload, created_at
- Tablas del dominio: [A], [B], [C]
Incluye constraints e índices relevantes. Usa tipos correctos (BIGINT si se guardan números grandes).

8) Stack (si no se especifica)
Si no te indico stack, asume:
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- DB: PostgreSQL
- Emails: Nodemailer (SMTP)
- Gráficas: Recharts
Pero si el usuario elige otro stack, adáptate.

9) Entregables obligatorios
- Arquitectura y estructura de carpetas.
- Esquema DB (migraciones o SQL).
- API backend documentada (endpoints, payloads y códigos).
- Frontend con pantallas principales (Landing, Auth, Dashboard, Módulos).
- .env.example para front y back.
- Guía de ejecución local y de despliegue.
- Verificación: build OK + checklist de pruebas manuales.

10) Forma de trabajo
- Si faltan datos críticos, haz preguntas (máximo 6).
- Propón un plan por fases: MVP → mejoras UX → hardening.
- Implementa primero autenticación + base + dashboard, luego módulos.
- Al final de cada fase, explica cómo probar y qué quedó listo.
```

