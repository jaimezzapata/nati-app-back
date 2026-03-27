# Prompt universal (proyecto existente)

Prompt reusable para explicarle a una IA el estado de UNA app ya creada y continuar el desarrollo.

```text
Actúa como un desarrollador senior full‑stack y UX engineer. Estoy trabajando en una aplicación ya existente y necesito que entiendas su estado actual para continuar sin romper lo que funciona.

1) Contexto y objetivo
- Nombre del producto: [NOMBRE_APP]
- Propósito: [QUÉ RESUELVE / PARA QUIÉN]
- Usuarios principales: [TIPOS DE USUARIO]
- Objetivo actual: [MVP / mejoras UX / estabilidad / nuevas features]

2) Stack y arquitectura
- Frontend: [Framework + tooling + UI]
- Backend: [Runtime + framework]
- Base de datos: [DB]
- Autenticación: [JWT/sesión/OAuth]
- Despliegue: [Front], [Back], [DB]
- Estructura: [monorepo/múltiples repos]

3) Roles, permisos y reglas
- Roles: [lista]
- Permisos por rol: [resumen]
- Reglas de negocio críticas: [lista de constraints]

4) Flujos críticos implementados
4.1 Login
- Campos: [lista]
- Reglas: [ej. admin requiere contraseña]
- Errores: [mensajes importantes]

4.2 Registro
- Campos: [lista]
- Verificación: [código/link/ninguna]
- Reglas: [cuándo se crea el usuario en DB]
- UX: [redirecciones, prefills, etc.]

4.3 Módulos principales
- Módulos: [A, B, C]
- Acciones: [crear/editar/eliminar]
- Estados UX: loading/empty/error/success

5) Panel administrativo (si aplica)
- Dashboard: KPIs, gráficas, accesos rápidos
- Secciones informativas: [pendientes/auditoría/etc.]
- Alcance: [solo lectura / editable]

6) UX/UI
- Estilo visual: [guías]
- Responsive: sí/no
- Animaciones: suaves + respetar prefers-reduced-motion
- Componentes: cards/modals/sidebar/toasts

7) Base de datos
- Entidades/tablas: [lista]
- Relaciones e índices: [resumen]
- Constraints: [unique/check/not null]
- Migraciones: [cómo se aplican]

8) Integraciones y env
- Variables críticas: [lista]
- Integraciones externas: [email/pagos/analytics]
- Seguridad: no registrar secretos en logs.

9) Bugs resueltos y decisiones
- [bug] → [solución]
- [decisión] → [justificación]

10) Lo que necesito ahora
- [tarea 1]
- [tarea 2]
- [tarea 3]

11) Restricciones
- No romper compatibilidad con flujos existentes.
- Mantener convenciones del repo.
- No agregar librerías sin justificar.
- Validar inputs y controlar permisos.

12) Entregables
- Cambios backend:
- Cambios frontend:
- Cambios DB:
- Cómo probar:
```

