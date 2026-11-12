# 📋 Especificación Funcional: Autenticación y Datos Aislados por Usuario

> **Estado:** `En Implementación` · **Fecha:** 2026-11-12

## 1. 🎯 Resumen Ejecutivo y Contexto

### 1.1 Problema
SportStats no tiene usuarios: cualquiera que abra la app ve y modifica todos los equipos, jugadores, partidos y estadísticas. Se necesita que varias personas (entrenadores, ligas, escuelas) usen la misma instancia sin ver ni alterar los datos de otros.

### 1.2 Objetivos (Goals)
- Registro de cuenta (nombre, correo, contraseña) e inicio/cierre de sesión.
- Toda la app (páginas y API) exige sesión válida.
- Cada cuenta ve **solo sus propios** equipos, jugadores, entrenadores, partidos, estadísticas, reportes, dashboard y torneos.
- Los catálogos (Rama, Categoría, Deportes, Posiciones, Estados, Tipos de partido) siguen siendo globales y de solo lectura.
- Los datos existentes antes de esta funcionalidad (sin dueño) se asignan a la **primera cuenta que se registre**.

### 1.3 Fuera de Alcance (Non-Goals)
- Recuperación de contraseña por correo, verificación de email, OAuth.
- Roles/permisos, compartir datos entre cuentas, equipos colaborativos.

## 2. 👥 Historias de Usuario
- **HU-1:** Como visitante, quiero crear una cuenta para empezar a registrar mis propios datos.
- **HU-2:** Como usuario, quiero iniciar sesión con correo y contraseña y permanecer conectado durante 7 días.
- **HU-3:** Como usuario, quiero cerrar sesión desde la barra lateral.
- **HU-4:** Como usuario, quiero tener la certeza de que otra cuenta no puede ver ni modificar mis datos, aunque conozca los IDs.

## 3. ✅ Criterios de Aceptación (Given / When / Then)

### Escenario 1: Registro e inicio de sesión
- **Dado que** no tengo sesión, **cuando** visito cualquier página, **entonces** soy redirigido a `/login`.
- **Dado que** completo el registro con correo válido y contraseña ≥ 6 caracteres, **cuando** envío el formulario, **entonces** se crea la cuenta, se inicia sesión y llego al Dashboard.
- **Dado que** ingreso credenciales correctas en `/login`, **entonces** se crea una cookie de sesión `httpOnly` y llego al Dashboard.

### Escenario 2: Validaciones y errores
- Registro con correo ya existente → mensaje "Ya existe una cuenta con ese correo" (409).
- Login con contraseña incorrecta → mensaje genérico "Correo o contraseña incorrectos" (401).
- Llamada a `/api/*` sin sesión → `401 { error: 'No autenticado' }`.

### Escenario 3: Aislamiento de datos
- **Dado que** el usuario A creó el equipo X, **cuando** el usuario B lista equipos, **entonces** X no aparece.
- **Cuando** B hace `PUT/DELETE /api/equipos/{id de X}` o consulta `/api/equipos/{id de X}/stats`, **entonces** recibe 404 y X no cambia.
- Lo mismo aplica a jugadores, entrenadores, partidos, alineaciones, estadísticas y torneos.
- B no puede asignar a sus jugadores/partidos/entrenadores un equipo de A.

## 4. 🎨 Requerimientos de UI/UX y Accesibilidad
- Pantallas `/login` y `/registro` a pantalla completa, con la identidad visual (azul primario, tarjeta blanca centrada), labels visibles, `autocomplete` correcto y mensajes de error en `role="alert"`.
- La barra lateral muestra el nombre/correo del usuario y un botón "Cerrar sesión".

## 5. ❓ Preguntas Abiertas y Riesgos
- Los datos previos sin dueño se asignan al primer registro; si se desea otro comportamiento, debe ajustarse `lib/schema.js`.
- La migración agrega columnas `idUsuario` con `ALTER TABLE` en caliente (idempotente).
