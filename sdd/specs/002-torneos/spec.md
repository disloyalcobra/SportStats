# 📋 Especificación Funcional: Torneos con Diagrama

> **Estado:** `En Implementación` · **Fecha:** 2026-11-12 · **Depende de:** 001

## 1. 🎯 Resumen Ejecutivo y Contexto

### 1.1 Problema
Los partidos se registran sueltos; no existe forma de organizar una competencia completa, generar su calendario/llaves ni ver quién avanza o lidera.

### 1.2 Objetivos (Goals)
- Crear torneos con los equipos propios del usuario eligiendo el formato:
  1. **Eliminación directa** — quien pierde queda fuera; llaves con *byes* automáticos si el número de equipos no es potencia de 2.
  2. **Liga por puntos** — todos contra todos (ida o ida y vuelta); puntos configurables por victoria / empate / derrota; tabla de posiciones.
  3. **Grupos + eliminatoria** — fase de grupos por puntos; los mejores N de cada grupo pasan a una eliminación directa.
- Ver el **diagrama** del torneo: cuadro de llaves (bracket) con conectores, o jornadas + tabla de posiciones.
- Registrar el resultado de cada enfrentamiento; el ganador avanza automáticamente y la tabla se recalcula.
- Mostrar campeón cuando el torneo termina.

### 1.3 Fuera de Alcance (Non-Goals)
- Doble eliminación (repechaje), sistema suizo.
- ~~Vincular automáticamente los enfrentamientos del torneo con `Partido` y sus estadísticas detalladas.~~ → Implementado en la spec 003.
- Torneos públicos o compartidos entre cuentas.

## 2. 👥 Historias de Usuario
- **HU-1:** Como usuario, quiero crear un torneo eligiendo nombre, formato y equipos participantes.
- **HU-2:** Como usuario, quiero ver el cuadro de llaves para saber quién juega contra quién en cada ronda.
- **HU-3:** Como usuario, quiero capturar el marcador de un enfrentamiento y que el ganador avance solo.
- **HU-4:** Como usuario de una liga, quiero ver la tabla de posiciones (PJ, G, E, P, PF, PC, DIF, PTS).
- **HU-5:** Como usuario, quiero eliminar un torneo o corregir un resultado.

## 3. ✅ Criterios de Aceptación (Given / When / Then)

### Escenario 1: Eliminación directa
- **Dado** un torneo de 6 equipos, **cuando** se crea, **entonces** se genera un cuadro de 8 lugares con 2 *byes*; los equipos con bye aparecen ya en la ronda 2.
- **Cuando** registro 70–65 en un partido de ronda 1, **entonces** el ganador aparece en su lugar de la ronda siguiente.
- No se permite empate en eliminatoria (400 "En eliminatoria no puede haber empate").
- **Cuando** se juega la final, **entonces** el torneo pasa a `Finalizado` y se muestra el campeón.
- Corregir un resultado cuyo ganador ya jugó la ronda siguiente → 409 (primero hay que borrar el resultado posterior).

### Escenario 2: Liga por puntos
- **Dado** 5 equipos ida, **entonces** se generan 5 jornadas (uno descansa por jornada) y 10 partidos.
- Con ida y vuelta, 20 partidos y localías invertidas.
- La tabla ordena por PTS, DIF, PF y nombre. Victoria/empate/derrota otorgan los puntos configurados (por defecto 3/1/0).

### Escenario 3: Grupos + eliminatoria
- **Dado** 8 equipos, 2 grupos, clasifican 2, **entonces** se forman grupos A/B de 4 por sorteo con siembra serpiente.
- **Cuando** todos los partidos de grupo tienen resultado, **entonces** se habilita "Generar eliminatoria" que cruza 1A–2B, 1B–2A.

### Escenario 4: Validaciones
- Mínimo 2 equipos (3 para grupos), máximo 64; equipos deben pertenecer al usuario.
- Grupos: cada grupo con ≥ 2 equipos; clasificados por grupo entre 1 y el tamaño del grupo más pequeño.

## 4. 🎨 Requerimientos de UI/UX y Accesibilidad
- `/torneos`: tarjetas con nombre, formato (badge), equipos, avance (partidos jugados/total) y campeón.
- Asistente de creación en modal: formato con tarjetas seleccionables y descripción, selección de equipos con checkboxes y "seleccionar todos", opciones específicas del formato.
- `/torneos/[id]`: diagrama con scroll horizontal; cada partido es un botón accesible que abre el modal de resultado. Ganador resaltado, perdedor atenuado, byes en gris.

## 5. ❓ Preguntas Abiertas y Riesgos
- Los torneos no generan registros en `Partido`; si se desea estadística detallada por jugador habrá que vincularlos en una spec futura.
