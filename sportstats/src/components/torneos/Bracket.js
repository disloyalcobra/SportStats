'use client';
import { nombreRonda } from '@/lib/torneos';

const SLOT_HEIGHT = 90; // alto aproximado de cada enfrentamiento de la 1.ª ronda (px)

function TeamRow({ id, score, partido, nombre, seed, byeText }) {
  const jugado = partido.marcadorLocal !== null && partido.marcadorVisitante !== null;
  const decidido = partido.idGanador !== null;
  let cls = 'bk-team';
  if (id === null) cls += ' tbd';
  else if (decidido && partido.idGanador === id) cls += ' winner';
  else if (decidido) cls += ' loser';

  return (
    <div className={cls}>
      {seed !== undefined && <span className="bk-team-seed">{id !== null ? seed ?? '' : ''}</span>}
      <span className="bk-team-name">{id !== null ? nombre(id) : byeText}</span>
      <span className="bk-team-score">{jugado ? score : ''}</span>
    </div>
  );
}

function Match({ partido, nombre, semilla, onSelect, editable }) {
  const listo = partido.idEquipoLocal !== null && partido.idEquipoVisitante !== null;
  const puedeEditar = editable && !partido.esBye && listo;
  const byeText = partido.esBye ? 'Pase directo' : 'Por definir';
  const label = listo
    ? `${nombre(partido.idEquipoLocal)} contra ${nombre(partido.idEquipoVisitante)}`
    : 'Enfrentamiento por definir';

  const rows = (
    <>
      <TeamRow id={partido.idEquipoLocal} score={partido.marcadorLocal} partido={partido}
        nombre={nombre} seed={semilla ? semilla(partido.idEquipoLocal) : undefined} byeText={byeText} />
      <TeamRow id={partido.idEquipoVisitante} score={partido.marcadorVisitante} partido={partido}
        nombre={nombre} seed={semilla ? semilla(partido.idEquipoVisitante) : undefined} byeText={byeText} />
    </>
  );

  if (partido.esBye) return <div className={'bk-match bye'} aria-label={`Pase directo de ${nombre(partido.idGanador)}`}>{rows}</div>;

  return (
    <button type="button" className="bk-match" disabled={!puedeEditar}
      onClick={() => onSelect(partido)}
      aria-label={puedeEditar ? `Registrar resultado: ${label}` : label}>
      {rows}
    </button>
  );
}

/**
 * Cuadro de eliminación directa.
 * Cada ronda es una columna; las parejas de partidos se unen con conectores CSS
 * hacia el partido de la ronda siguiente.
 */
export default function Bracket({ partidos, nombre, semilla, onSelect, editable = true, idCampeon }) {
  const rondas = [...new Set(partidos.map(p => p.ronda))].sort((a, b) => a - b);
  if (rondas.length === 0) return null;
  const total = rondas.length;
  const primeraRonda = partidos.filter(p => p.ronda === rondas[0]).length;
  const altura = Math.max(primeraRonda * SLOT_HEIGHT, 120);

  const columnas = rondas.map(r => {
    const enRonda = partidos.filter(p => p.ronda === r).sort((a, b) => a.posicion - b.posicion);
    const parejas = [];
    for (let i = 0; i < enRonda.length; i += 2) parejas.push(enRonda.slice(i, i + 2));
    return { ronda: r, parejas };
  });

  return (
    <div className="bracket-scroll" role="region" aria-label="Cuadro de eliminación" tabIndex={0}>
      <div className="bracket">
        {columnas.map((col, idx) => (
          <div key={col.ronda} className={`bk-round has-next${idx > 0 ? ' has-prev' : ''}`}>
            <div className="bk-round-title">{nombreRonda(col.ronda, total)}</div>
            <div className="bk-round-body" style={{ height: altura }}>
              {col.parejas.map((pareja, i) => (
                <div key={i} className={`bk-pair${pareja.length === 2 ? ' double' : ''}`}>
                  {pareja.map(p => (
                    <div key={p.idTorneoPartido} className="bk-slot">
                      <Match partido={p} nombre={nombre} semilla={semilla} onSelect={onSelect} editable={editable} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bk-round has-prev">
          <div className="bk-round-title">Campeón</div>
          <div className="bk-round-body" style={{ height: altura }}>
            <div className="bk-pair">
              <div className="bk-slot">
                {idCampeon ? (
                  <div className="bk-champion-box">
                    <span className="champion-trophy" aria-hidden="true">1º</span>
                    <span>{nombre(idCampeon)}</span>
                  </div>
                ) : (
                  <div className="bk-champion-box empty">Por definir</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
