'use client';

/** Tabla de posiciones de liga o de un grupo. `clasifican` resalta las primeras N filas. */
export default function TablaPosiciones({ filas, nombre, clasifican = 0, titulo }) {
  return (
    <div className="table-wrapper">
      <table className="standings">
        {titulo && <caption style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 8px' }}>{titulo}</caption>}
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th title="Partidos jugados">PJ</th>
            <th title="Ganados">G</th>
            <th title="Empatados">E</th>
            <th title="Perdidos">P</th>
            <th title="Puntos (anotación) a favor">PF</th>
            <th title="Puntos (anotación) en contra">PC</th>
            <th title="Diferencia">DIF</th>
            <th title="Puntos de tabla">PTS</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.idEquipo} className={f.pos <= clasifican ? 'qualifies' : ''}>
              <td style={{ fontWeight: 700 }}>{f.pos}</td>
              <td style={{ fontWeight: 600 }}>{nombre(f.idEquipo)}</td>
              <td>{f.PJ}</td>
              <td>{f.G}</td>
              <td>{f.E}</td>
              <td>{f.P}</td>
              <td>{f.PF}</td>
              <td>{f.PC}</td>
              <td style={{ color: f.DIF > 0 ? '#15803D' : f.DIF < 0 ? 'var(--accent)' : undefined }}>
                {f.DIF > 0 ? `+${f.DIF}` : f.DIF}
              </td>
              <td style={{ fontWeight: 800 }}>{f.PTS}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
