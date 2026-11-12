// Lógica pura de torneos: sin acceso a BD para poder probarse de forma aislada.

export const FORMATOS = {
  eliminacion: {
    label: 'Eliminación directa',
    corto: 'Eliminación',
    descripcion: 'Quien pierde queda fuera. Se arma un cuadro de llaves; si los equipos no son potencia de 2, los mejores sembrados pasan directo (bye).',
    minEquipos: 2,
  },
  liga: {
    label: 'Liga por puntos',
    corto: 'Liga',
    descripcion: 'Todos contra todos. Cada resultado suma puntos (victoria, empate, derrota) y gana quien termine primero en la tabla.',
    minEquipos: 2,
  },
  grupos: {
    label: 'Grupos + eliminatoria',
    corto: 'Grupos',
    descripcion: 'Fase de grupos por puntos; los mejores de cada grupo avanzan a un cuadro de eliminación directa.',
    minEquipos: 3,
  },
};

export const MAX_EQUIPOS = 64;

export const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

/** Orden estándar de siembra en el cuadro: size 8 → [1,8,4,5,2,7,3,6]. */
export function seedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap(s => [s, len + 1 - s]);
  }
  return order;
}

/** Ronda/posición del partido al que avanza el ganador, y en qué lado. */
export function slotSiguiente(ronda, posicion) {
  return {
    ronda: ronda + 1,
    posicion: Math.ceil(posicion / 2),
    lado: posicion % 2 === 1 ? 'local' : 'visitante',
  };
}

export const totalRondas = (numEquipos) => Math.log2(nextPow2(Math.max(2, numEquipos)));

/**
 * Genera el cuadro completo de eliminación directa.
 * @param {number[]} equipos  ids ordenados por siembra (el primero es la semilla 1)
 * @returns partidos [{ fase, ronda, posicion, idEquipoLocal, idEquipoVisitante, idGanador, esBye }]
 */
export function generarEliminatoria(equipos) {
  const size = nextPow2(Math.max(2, equipos.length));
  const order = seedOrder(size);
  const rondas = Math.log2(size);
  const partidos = [];
  const key = (r, p) => `${r}-${p}`;
  const mapa = new Map();

  for (let r = 1; r <= rondas; r++) {
    const n = size / 2 ** r;
    for (let p = 1; p <= n; p++) {
      const partido = {
        fase: 'eliminatoria', grupo: null, ronda: r, posicion: p,
        idEquipoLocal: null, idEquipoVisitante: null, idGanador: null, esBye: 0,
      };
      if (r === 1) {
        partido.idEquipoLocal = equipos[order[2 * (p - 1)] - 1] ?? null;
        partido.idEquipoVisitante = equipos[order[2 * (p - 1) + 1] - 1] ?? null;
      }
      partidos.push(partido);
      mapa.set(key(r, p), partido);
    }
  }

  // Byes de la primera ronda: el equipo presente avanza automáticamente.
  for (const p of partidos.filter(x => x.ronda === 1)) {
    const solo = p.idEquipoLocal ?? p.idEquipoVisitante;
    if ((p.idEquipoLocal == null) !== (p.idEquipoVisitante == null)) {
      p.esBye = 1;
      p.idGanador = solo;
      if (rondas > 1) {
        const sig = slotSiguiente(1, p.posicion);
        const destino = mapa.get(key(sig.ronda, sig.posicion));
        destino[sig.lado === 'local' ? 'idEquipoLocal' : 'idEquipoVisitante'] = solo;
      }
    }
  }
  return partidos;
}

/**
 * Calendario todos contra todos (método del círculo).
 * Con número impar de equipos, uno descansa en cada jornada.
 */
export function generarRoundRobin(equipos, { idaVuelta = false, fase = 'liga', grupo = null } = {}) {
  const lista = [...equipos];
  if (lista.length % 2 === 1) lista.push(null);
  const n = lista.length;
  const jornadas = n - 1;
  const partidos = [];

  let rot = lista.slice(1);
  for (let j = 0; j < jornadas; j++) {
    const ronda = [lista[0], ...rot];
    let posicion = 1;
    for (let i = 0; i < n / 2; i++) {
      const a = ronda[i];
      const b = ronda[n - 1 - i];
      if (a == null || b == null) continue;
      // Alternar localía para repartirla de forma equilibrada
      const invertir = (i === 0 && j % 2 === 1) || (i > 0 && i % 2 === 1);
      partidos.push({
        fase, grupo, ronda: j + 1, posicion: posicion++,
        idEquipoLocal: invertir ? b : a,
        idEquipoVisitante: invertir ? a : b,
        idGanador: null, esBye: 0,
      });
    }
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }

  if (idaVuelta) {
    const vuelta = partidos.map(p => ({
      ...p,
      ronda: p.ronda + jornadas,
      idEquipoLocal: p.idEquipoVisitante,
      idEquipoVisitante: p.idEquipoLocal,
    }));
    partidos.push(...vuelta);
  }
  return partidos;
}

export const letraGrupo = (i) => String.fromCharCode(65 + i);

/** Reparte equipos (ordenados por siembra) en grupos con siembra serpiente. */
export function asignarGrupos(equipos, numGrupos) {
  const grupos = Array.from({ length: numGrupos }, () => []);
  equipos.forEach((id, i) => {
    const fila = Math.floor(i / numGrupos);
    const col = fila % 2 === 0 ? i % numGrupos : numGrupos - 1 - (i % numGrupos);
    grupos[col].push(id);
  });
  return Object.fromEntries(grupos.map((g, i) => [letraGrupo(i), g]));
}

export const tieneResultado = (p) =>
  !p.esBye && p.marcadorLocal !== null && p.marcadorLocal !== undefined &&
  p.marcadorVisitante !== null && p.marcadorVisitante !== undefined;

/**
 * Tabla de posiciones.
 * @param {number[]} equipos
 * @param {object[]} partidos  con idEquipoLocal, idEquipoVisitante, marcadorLocal, marcadorVisitante
 * @param {{victoria:number, empate:number, derrota:number}} puntos
 * @param {(id:number)=>string} nombre  para desempate alfabético
 */
export function calcularTabla(equipos, partidos, puntos, nombre = String) {
  const filas = new Map(equipos.map(id => [Number(id), {
    idEquipo: Number(id), PJ: 0, G: 0, E: 0, P: 0, PF: 0, PC: 0, DIF: 0, PTS: 0,
  }]));

  for (const p of partidos) {
    if (!tieneResultado(p)) continue;
    const l = filas.get(Number(p.idEquipoLocal));
    const v = filas.get(Number(p.idEquipoVisitante));
    if (!l || !v) continue;
    const ml = Number(p.marcadorLocal);
    const mv = Number(p.marcadorVisitante);
    l.PJ++; v.PJ++;
    l.PF += ml; l.PC += mv;
    v.PF += mv; v.PC += ml;
    if (ml > mv) { l.G++; v.P++; l.PTS += puntos.victoria; v.PTS += puntos.derrota; }
    else if (ml < mv) { v.G++; l.P++; v.PTS += puntos.victoria; l.PTS += puntos.derrota; }
    else { l.E++; v.E++; l.PTS += puntos.empate; v.PTS += puntos.empate; }
  }

  const lista = [...filas.values()];
  lista.forEach(f => { f.DIF = f.PF - f.PC; });
  lista.sort((a, b) =>
    b.PTS - a.PTS || b.DIF - a.DIF || b.PF - a.PF ||
    String(nombre(a.idEquipo)).localeCompare(String(nombre(b.idEquipo))));
  return lista.map((f, i) => ({ ...f, pos: i + 1 }));
}

/**
 * Clasificados de la fase de grupos ordenados como siembra para el cuadro:
 * todos los primeros (A, B, C…), luego todos los segundos, etc.
 * Así, con 2 grupos y 2 clasificados: 1A–2B y 1B–2A.
 */
export function sembrarClasificados(tablasPorGrupo, clasificanPorGrupo) {
  const letras = Object.keys(tablasPorGrupo).sort();
  const sembrados = [];
  for (let pos = 0; pos < clasificanPorGrupo; pos++) {
    for (const g of letras) {
      const fila = tablasPorGrupo[g][pos];
      if (fila) sembrados.push(fila.idEquipo);
    }
  }
  return sembrados;
}

/** Nombre de la ronda según cuántas faltan para la final. */
export function nombreRonda(ronda, rondasTotales) {
  const faltan = rondasTotales - ronda;
  if (faltan === 0) return 'Final';
  if (faltan === 1) return 'Semifinal';
  if (faltan === 2) return 'Cuartos de final';
  if (faltan === 3) return 'Octavos de final';
  return `Ronda ${ronda}`;
}

export function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
