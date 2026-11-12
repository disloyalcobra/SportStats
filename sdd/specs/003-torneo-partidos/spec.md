# 📋 Especificación Funcional: Partidos y Estadísticas en Torneos

> **Estado:** `En Revisión` · **Fecha:** 2026-11-12 · **Depende de:** 001, 002

## 1. 🎯 Resumen Ejecutivo y Contexto

### 1.1 Problema
En la spec 002 los enfrentamientos de un torneo solo guardaban un marcador. No existía un `Partido` asociado, así que esos juegos no tenían alineación ni estadísticas por jugador y no aparecían en Partidos, Reportes ni Dashboard.

### 1.2 Objetivos (Goals)
- Cada enfrentamiento con sus dos equipos definidos genera un **Partido real**: tipo "Torneo", estado Próximo, alineación con los jugadores activos y estadísticas en 0.
- El resultado se sincroniza en ambos sentidos:
  - **Desde el partido:** capturar estadísticas → *Marcar Culminado* → el torneo toma el marcador (`marcadorFinalE`) y el ganador avanza.
  - **Desde el torneo:** el marcador rápido actualiza el Partido y lo marca *Culminado*.
- Reabrir un partido culminado borra su resultado en el torneo, cuando esto es posible.
- Los partidos de rondas siguientes se crean al definirse sus dos equipos.

### 1.3 Fuera de Alcance (Non-Goals)
- Programación automática de horarios y sedes (la fecha es tentativa: una semana por jornada o ronda desde la fecha de inicio).

## 2. 👥 Historias de Usuario
- **HU-1:** Como usuario, quiero capturar estadísticas por jugador de los partidos del torneo.
- **HU-2:** Como usuario, quiero que los partidos del torneo aparezcan en Partidos, Reportes y Dashboard.
- **HU-3:** Como usuario, quiero cerrar el partido desde donde me resulte cómodo: el torneo o el partido.

## 3. ✅ Criterios de Aceptación (Given / When / Then)
- **Dado** un torneo nuevo, **entonces** cada enfrentamiento con ambos equipos tiene un Partido (los byes no generan Partido).
- **Cuando** culmino un Partido de eliminatoria 70–55, **entonces** el torneo registra 70–55, el ganador avanza y, si ya se conocen ambos equipos de la siguiente ronda, se crea su Partido.
- **Cuando** culmino un Partido de eliminatoria empatado, **entonces** se rechaza (400) y el partido no cambia.
- **Cuando** capturo un marcador rápido en el torneo, **entonces** el Partido guarda ese marcador y queda *Culminado*.
- Marcador rápido sobre un Partido que ya tiene estadísticas de jugadores → 409 (se edita desde el partido).
- Reabrir un Partido cuyo ganador ya jugó la siguiente ronda → 409.
- Eliminar un Partido que pertenece a un torneo → 409. Eliminar el torneo elimina sus Partidos.
- Torneos creados antes de esta spec generan sus Partidos al abrirse.

## 4. 🎨 Requerimientos de UI/UX y Accesibilidad
- El modal de resultado muestra el Partido vinculado con los botones *Ver partido* y *Capturar estadísticas*.
- El detalle del partido muestra el aviso "Partido del torneo X · ronda/jornada", con enlace.
- La lista de Partidos muestra el nombre del torneo bajo el tipo.
- Los errores al culminar o reabrir se muestran al usuario.

## 5. ❓ Preguntas Abiertas y Riesgos
- Si el ganador de una ronda cambia y el Partido siguiente estaba pendiente y sin datos, se elimina y se recrea con el rival correcto. Si ya tenía datos, se bloquea con 409.
