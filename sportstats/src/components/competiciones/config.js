// Textos y rutas por tipo de competición (spec 004)
export const COMPETICIONES = {
  torneo: {
    titulo: 'Torneos',
    singular: 'torneo',
    articulo: 'el torneo',
    base: '/torneos',
    crear: '+ Crear torneo',
    vacio: 'Aún no tienes torneos',
    vacioDesc: 'Crea uno por eliminación directa, liga por puntos o grupos con eliminatoria.',
    placeholder: 'Ej. Copa Primavera 2026',
  },
  temporada: {
    titulo: 'Temporadas',
    singular: 'temporada',
    articulo: 'la temporada',
    base: '/temporadas',
    crear: '+ Crear temporada',
    vacio: 'Aún no tienes temporadas',
    vacioDesc: 'Una temporada es una liga con calendario entre dos fechas y, si quieres, playoffs con los mejores equipos.',
    placeholder: 'Ej. Apertura 2026',
  },
};

export const rutaCompeticion = (tipo, id) => `${(COMPETICIONES[tipo] || COMPETICIONES.torneo).base}/${id}`;

export function formatoFecha(f) {
  if (!f) return '';
  return new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const rangoFechas = (inicio, fin) =>
  [formatoFecha(inicio), formatoFecha(fin)].filter(Boolean).join(' – ');
