'use client';

/** Lista de partidos agrupados por jornada (liga / fase de grupos). */
export default function Jornadas({ partidos, nombre, onSelect, editable = true }) {
  const jornadas = [...new Set(partidos.map(p => p.ronda))].sort((a, b) => a - b);

  return (
    <div>
      {jornadas.map(j => (
        <div key={j}>
          <div className="jornada-title">Jornada {j}</div>
          <div className="fixture-list">
            {partidos.filter(p => p.ronda === j).map(p => {
              const jugado = p.marcadorLocal !== null && p.marcadorVisitante !== null;
              return (
                <button key={p.idTorneoPartido} type="button" className="fixture" disabled={!editable}
                  onClick={() => onSelect(p)}
                  aria-label={`${nombre(p.idEquipoLocal)} contra ${nombre(p.idEquipoVisitante)}${jugado ? `, ${p.marcadorLocal} a ${p.marcadorVisitante}` : ', sin resultado'}`}>
                  <span className={`fixture-home${p.idGanador === p.idEquipoLocal ? ' win' : ''}`}>
                    {nombre(p.idEquipoLocal)}
                  </span>
                  <span className={`fixture-score${jugado ? '' : ' pending'}`}>
                    {jugado ? `${p.marcadorLocal} – ${p.marcadorVisitante}` : 'vs'}
                  </span>
                  <span className={p.idGanador === p.idEquipoVisitante ? 'win' : ''}>
                    {nombre(p.idEquipoVisitante)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
