'use client';
import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function JugadorDetallePage({ params }) {
  const { id } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statViewMode, setStatViewMode] = useState('general'); // 'general' | 'partido'
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTipoPartido, setFilterTipoPartido] = useState('');

  const load = (year = filterYear, tipo = filterTipoPartido) => {
    setLoading(true);
    let url = `/api/jugadores/${id}/stats?`;
    if (year) url += `year=${year}&`;
    if (tipo) url += `idTipoPartido=${tipo}&`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          if (d.partidos && d.partidos.length > 0 && !selectedMatchId) {
            setSelectedMatchId(String(d.partidos[0].idPartido));
          }
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load('', ''); }, [id]);

  const jugador = data?.jugador;
  const resumen = data?.resumenGeneral;
  const partidos = data?.partidos || [];
  const filtros = data?.filtros || { anios: [], tiposPartido: [] };

  const matchSelected = partidos.find(p => String(p.idPartido) === String(selectedMatchId));

  const calcAge = (dob) => {
    if (!dob) return '-';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <AppShell
      title={jugador ? `${jugador.NombreJugador} ${jugador.ApellidoPJugador}` : 'Ficha de Jugador'}
      subtitle={jugador ? `#${jugador.NumeroJugador || '—'} · ${jugador.NombreEquipo} · ${jugador.posicion || 'Sin posición'}` : ''}
      actions={
        <Link href="/jugadores">
          <button className="btn btn-ghost">← Volver a Jugadores</button>
        </Link>
      }
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando ficha del jugador...</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {data && jugador && (
        <>
          {/* Banner Header de Jugador */}
          <div className="card mb-24" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div className="flex-center gap-16">
                <div className="jersey-num" style={{ width: 64, height: 64, fontSize: 26, background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>
                  #{jugador.NumeroJugador || '—'}
                </div>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>
                    {jugador.NombreJugador} {jugador.ApellidoPJugador} {jugador.ApellidoMJugador || ''}
                  </h1>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {jugador.NombreEquipo} · {jugador.posicion || 'Posición N/A'} · Semestre {jugador.SemestreJugador}° · {calcAge(jugador.FechaNacimiento)} años ({jugador.LugarDeOrigenJugador || 'N/A'})
                  </div>
                </div>
              </div>

              {/* Botones de Vista */}
              <div className="flex gap-8">
                <button
                  className={`btn ${statViewMode === 'general' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ color: statViewMode === 'general' ? 'white' : 'rgba(255,255,255,0.8)' }}
                  onClick={() => setStatViewMode('general')}
                >
                  📈 Promedios Generales
                </button>
                <button
                  className={`btn ${statViewMode === 'partido' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ color: statViewMode === 'partido' ? 'white' : 'rgba(255,255,255,0.8)' }}
                  onClick={() => setStatViewMode('partido')}
                >
                  🏀 Por Partido
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex-center gap-16 flex-wrap">
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Filtros de Período:</span>
                <select
                  className="form-select"
                  style={{ width: 160 }}
                  value={filterYear}
                  onChange={e => {
                    setFilterYear(e.target.value);
                    load(e.target.value, filterTipoPartido);
                  }}
                >
                  <option value="">Todos los años</option>
                  {filtros.anios.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <select
                  className="form-select"
                  style={{ width: 180 }}
                  value={filterTipoPartido}
                  onChange={e => {
                    setFilterTipoPartido(e.target.value);
                    load(filterYear, e.target.value);
                  }}
                >
                  <option value="">Todos los tipos de partido</option>
                  {filtros.tiposPartido.map(t => (
                    <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.TipoPartido}</option>
                  ))}
                </select>

                {(filterYear || filterTipoPartido) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFilterYear(''); setFilterTipoPartido(''); load('', ''); }}>
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* VISTA GENERAL */}
          {statViewMode === 'general' && resumen && (
            <>
              {/* Tarjetas resumen de promedios */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PARTIDOS JUGADOS</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-dark)', margin: '6px 0' }}>
                    {resumen.totalPartidos}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Historial registrado</div>
                </div>

                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PPG (PUNTOS / JUEGO)</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b', margin: '6px 0' }}>
                    {resumen.promedios.puntos}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Calculado al vuelo</div>
                </div>

                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>RPG (REBOTES / JUEGO)</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#3b82f6', margin: '6px 0' }}>
                    {resumen.promedios.rebotes}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rebotes promedio</div>
                </div>

                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>APG (ASISTENCIAS / JUEGO)</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', margin: '6px 0' }}>
                    {resumen.promedios.asistencias}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Asistencias promedio</div>
                </div>

                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>EFF / PIR PROMEDIO</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#8b5cf6', margin: '6px 0' }}>
                    {resumen.promedios.eff} / {resumen.promedios.pir}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Valoración global</div>
                </div>
              </div>

              {/* Tabla de Promedios y Efectividades */}
              <div className="card mb-24">
                <div className="card-header">
                  <div className="card-title">📊 Promedios y % de Tiro por Partido</div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>MIN/G</th><th>PTS</th><th>FG%</th><th>3P%</th><th>FT%</th><th>STL</th><th>BLK</th><th>TOV</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 700 }}>{resumen.promedios.minutos}'</td>
                        <td style={{ fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>{resumen.promedios.puntos}</td>
                        <td><strong>{resumen.promedios.pctFG}%</strong></td>
                        <td><strong>{resumen.promedios.pct3P}%</strong></td>
                        <td><strong>{resumen.promedios.pctFT}%</strong></td>
                        <td>{resumen.promedios.robos}</td>
                        <td>{resumen.promedios.bloqueos}</td>
                        <td>{resumen.promedios.perdidas}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabla de Acumulados */}
              <div className="card mb-24">
                <div className="card-header">
                  <div className="card-title">🔢 Totales Acumulados</div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>MIN Total</th><th>PTS Total</th><th>2PM/A</th><th>3PM/A</th><th>FTM/A</th><th>REB (O/D)</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>PF</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{resumen.totales.totMin}'</td>
                        <td style={{ fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>{resumen.totales.totPts}</td>
                        <td>{resumen.totales.tot2PM}/{resumen.totales.tot2PA}</td>
                        <td>{resumen.totales.tot3PM}/{resumen.totales.tot3PA}</td>
                        <td>{resumen.totales.totFTM}/{resumen.totales.totFTA}</td>
                        <td>{resumen.totales.totReb}</td>
                        <td>{resumen.totales.totAst}</td>
                        <td>{resumen.totales.totRobos}</td>
                        <td>{resumen.totales.totBloqueos}</td>
                        <td>{resumen.totales.totTOV}</td>
                        <td>{resumen.totales.totPF}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* VISTA POR PARTIDO */}
          {statViewMode === 'partido' && (
            <>
              <div className="card mb-24">
                <div className="card-body">
                  <div className="form-group mb-0">
                    <label className="form-label">Seleccionar Partido del Historial del Jugador</label>
                    <select
                      className="form-select"
                      value={selectedMatchId}
                      onChange={e => setSelectedMatchId(e.target.value)}
                    >
                      {partidos.map(p => (
                        <option key={p.idPartido} value={p.idPartido}>
                          {p.fecha} — vs {p.Localia === 1 ? p.equipoVisitante : p.equipoLocal} ({p.puntos} pts) [{p.TipoPartido}]
                        </option>
                      ))}
                      {partidos.length === 0 && <option value="">Sin partidos en el historial del jugador</option>}
                    </select>
                  </div>
                </div>
              </div>

              {matchSelected ? (
                <div className="card mb-24">
                  <div className="card-header">
                    <div className="card-title">
                      🏀 Rendimiento en Partido ({formatFecha(matchSelected.fecha)}) — vs {matchSelected.Localia === 1 ? matchSelected.equipoVisitante : matchSelected.equipoLocal}
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>MIN</th><th>PTS</th><th>2PM/A</th><th>3PM/A</th><th>FTM/A</th><th>REB (O/D)</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>PF</th><th>EFF</th><th>PIR</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{matchSelected.minutos}'</td>
                          <td style={{ fontWeight: 900, fontSize: 18, color: 'var(--primary)' }}>{matchSelected.puntos}</td>
                          <td>{matchSelected.two_pm}/{matchSelected.two_pa}</td>
                          <td>{matchSelected.three_pm}/{matchSelected.three_pa}</td>
                          <td>{matchSelected.ftm}/{matchSelected.fta}</td>
                          <td>{matchSelected.totalRebotes} ({matchSelected.reboteOfensivo}/{matchSelected.reboteDefensivo})</td>
                          <td>{matchSelected.asistencia}</td>
                          <td>{matchSelected.robos}</td>
                          <td>{matchSelected.bloqueos}</td>
                          <td>{matchSelected.perdida}</td>
                          <td>{matchSelected.faltasPersonales}</td>
                          <td><strong>{matchSelected.EFF}</strong></td>
                          <td><strong>{matchSelected.PIR}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">🏀</div>
                    <div className="empty-state-title">Sin partidos seleccionados</div>
                    <div className="empty-state-desc">Selecciona un partido del menú desplegable arriba para ver su detalle</div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
