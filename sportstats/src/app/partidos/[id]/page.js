'use client';
import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PartidoDetallePage({ params }) {
  const { id } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [addJugadorId, setAddJugadorId] = useState('');
  const [addLocalia, setAddLocalia] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/partidos/${id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const handleAddJugador = async () => {
    if (!addJugadorId) return;
    setSaving(true);
    try {
      await fetch(`/api/partidos/${id}/alineacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idJugador: addJugadorId, Localia: addLocalia }),
      });
      setAddModal(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleRemoveJugador = async (idJP) => {
    if (!confirm('¿Quitar jugador de la alineación?')) return;
    await fetch(`/api/partidos/${id}/alineacion?idJugadoresPartido=${idJP}`, { method: 'DELETE' });
    load();
  };

  const handleChangeEstado = async (nuevoEstado) => {
    if (!data?.partido) return;
    const p = data.partido;
    await fetch(`/api/partidos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: p.fecha, horaInicio: p.horaInicio, horaTermino: p.horaTermino,
        idEstadoPartido: nuevoEstado, idTipoPartido: p.idTipoPartido,
        ubicacion: p.ubicacion, localia: p.localia,
      }),
    });
    load();
  };

  const partido = data?.partido;
  const alineacion = data?.alineacion || [];
  const statsEquipo = data?.statsEquipo || [];
  const lideres = data?.lideres || {};

  const disponibles = (data?.jugadoresDisponibles || []).filter(
    j => !alineacion.find(a => a.idJugador === j.idJugador)
  );

  const locales = alineacion.filter(j => j.Localia === 1 || j.Localia === true);
  const visitantes = alineacion.filter(j => j.Localia === 0 || j.Localia === false);

  const localTeamStats = statsEquipo[0] || {};
  const visTeamStats = statsEquipo[1] || {};

  const estadoBadge = (e) => {
    const map = { 'Culminado': 'badge-green', 'Proximo': 'badge-blue', 'Pospuesto': 'badge-yellow', 'Anulado': 'badge-red' };
    return map[e] || 'badge-gray';
  };

  return (
    <AppShell
      title={`Partido #${id}`}
      subtitle={partido ? `${formatFecha(partido.fecha)} — ${partido.ubicacion || 'Sin ubicación'}` : ''}
      actions={
        <div className="flex gap-8">
          <Link href="/partidos">
            <button className="btn btn-ghost">← Volver</button>
          </Link>
          {partido?.estadoPartido !== 'Culminado' ? (
            <>
              <Link href={`/partidos/${id}/estadisticas`}>
                <button className="btn btn-primary">Capturar / Editar Stats</button>
              </Link>
              <button className="btn btn-ghost" onClick={() => handleChangeEstado(1)}>
                Marcar Culminado
              </button>
            </>
          ) : (
            <>
              <Link href={`/partidos/${id}/estadisticas`}>
                <button className="btn btn-ghost">Ver Stats (Solo Lectura)</button>
              </Link>
              <button className="btn btn-primary" onClick={() => handleChangeEstado(4)}>
                Reabrir Partido
              </button>
            </>
          )}
        </div>
      }
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando partido...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {partido && (
        <>
          {/* Header Scorecard & Details */}
          <div className="grid-2 mb-24">
            {/* Score card principal */}
            {statsEquipo.length >= 2 ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span className={`badge ${estadoBadge(partido.estadoPartido)}`}>{partido.estadoPartido}</span>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>{partido.TipoPartido}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{localTeamStats.NombreEquipo || 'Local'}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: (localTeamStats.PTS >= visTeamStats.PTS) ? '#4ade80' : '#94a3b8' }}>
                      {localTeamStats.PTS ?? 0}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.4 }}>VS</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{visTeamStats.NombreEquipo || 'Visitante'}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: (visTeamStats.PTS >= localTeamStats.PTS) ? '#4ade80' : '#94a3b8' }}>
                      {visTeamStats.PTS ?? 0}
                    </div>
                  </div>
                </div>

                {/* Marcador por cuartos */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, 1fr)', gap: 8, fontSize: 12, textAlign: 'center' }}>
                    <div style={{ textAlign: 'left', fontWeight: 600, opacity: 0.7 }}>Cuartos</div>
                    <div>Q1</div><div>Q2</div><div>Q3</div><div>Q4</div><div style={{ fontWeight: 700 }}>Total</div>

                    <div style={{ textAlign: 'left', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {localTeamStats.NombreEquipo}
                    </div>
                    <div>{localTeamStats.marcadorPrimerCuartoE ?? 0}</div>
                    <div>{localTeamStats.marcadorSegundoCuartoE ?? 0}</div>
                    <div>{localTeamStats.marcadorTercerCuartoE ?? 0}</div>
                    <div>{localTeamStats.marcadorCuartoCuartoE ?? 0}</div>
                    <div style={{ fontWeight: 800, color: '#4ade80' }}>{localTeamStats.PTS ?? 0}</div>

                    <div style={{ textAlign: 'left', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {visTeamStats.NombreEquipo}
                    </div>
                    <div>{visTeamStats.marcadorPrimerCuartoE ?? 0}</div>
                    <div>{visTeamStats.marcadorSegundoCuartoE ?? 0}</div>
                    <div>{visTeamStats.marcadorTercerCuartoE ?? 0}</div>
                    <div>{visTeamStats.marcadorCuartoCuartoE ?? 0}</div>
                    <div style={{ fontWeight: 800, color: '#4ade80' }}>{visTeamStats.PTS ?? 0}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card flex-center" style={{ justifyContent: 'center' }}>
                <div className="empty-state" style={{ padding: '24px' }}>
                  <div className="empty-state-desc">Aún no hay estadísticas de equipo registradas</div>
                  {partido.estadoPartido === 'Culminado' && (
                    <div style={{ marginTop: 12 }}>
                      <Link href={`/partidos/${id}/estadisticas`}>
                        <button className="btn btn-primary">Capturar ahora</button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info del partido */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Detalles del Evento</div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    ['Fecha', formatFecha(partido.fecha)],
                    ['Horario', `${partido.horaInicio || '—'} - ${partido.horaTermino || '—'}`],
                    ['Ubicación', partido.ubicacion || 'Sin datos'],
                    ['Competencia', partido.TipoPartido || '—'],
                    ['Estado', partido.estadoPartido],
                    ['ID Partido', `#${partido.idPartido}`],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Seccion de Líderes del Partido */}
          {statsEquipo.length >= 2 && (lideres.puntos || lideres.rebotes || lideres.asistencias) && (
            <div className="card mb-24">
              <div className="card-header">
                <div className="card-title">Líderes del Partido</div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  {lideres.puntos && (
                    <div style={{ background: 'var(--gray-bg)', padding: '14px 16px', borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Máximo Anotador
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                        {lideres.puntos.valor} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>PTS</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        #{lideres.puntos.NumeroJugador} {lideres.puntos.NombreJugador} {lideres.puntos.ApellidoPJugador}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lideres.puntos.NombreEquipo}</div>
                    </div>
                  )}

                  {lideres.rebotes && (
                    <div style={{ background: 'var(--gray-bg)', padding: '14px 16px', borderRadius: 10, borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Más Rebotes
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                        {lideres.rebotes.valor} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>REB</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        #{lideres.rebotes.NumeroJugador} {lideres.rebotes.NombreJugador} {lideres.rebotes.ApellidoPJugador}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lideres.rebotes.NombreEquipo}</div>
                    </div>
                  )}

                  {lideres.asistencias && (
                    <div style={{ background: 'var(--gray-bg)', padding: '14px 16px', borderRadius: 10, borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Más Asistencias
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                        {lideres.asistencias.valor} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>AST</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        #{lideres.asistencias.NumeroJugador} {lideres.asistencias.NombreJugador} {lideres.asistencias.ApellidoPJugador}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lideres.asistencias.NombreEquipo}</div>
                    </div>
                  )}

                  {lideres.eficiencia && (
                    <div style={{ background: 'var(--gray-bg)', padding: '14px 16px', borderRadius: 10, borderLeft: '4px solid #8b5cf6' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Mayor Eficiencia (EFF)
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                        {lideres.eficiencia.valor} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>EFF</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        #{lideres.eficiencia.NumeroJugador} {lideres.eficiencia.NombreJugador} {lideres.eficiencia.ApellidoPJugador}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lideres.eficiencia.NombreEquipo}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats Comparativas por equipo */}
          {statsEquipo.length >= 2 && (
            <div className="card mb-24">
              <div className="card-header">
                <div className="card-title">Comparativa Estadística de Equipos</div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Equipo</th><th>PTS</th><th>FGM/A</th><th>FG%</th>
                      <th>3PM/A</th><th>3P%</th><th>FTM/A</th><th>FT%</th>
                      <th>OReb</th><th>DReb</th><th>Reb</th>
                      <th>Ast</th><th>TOV</th><th>STL</th><th>BLK</th><th>PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsEquipo.map((se, idx) => (
                      <tr key={se.idEstadisticasEquipo}>
                        <td style={{ fontWeight: 800 }}>
                          {se.NombreEquipo}
                        </td>
                        <td style={{ fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>{se.PTS}</td>
                        <td>{se.FGM}/{se.FGA}</td>
                        <td><strong>{se['FG%']}%</strong></td>
                        <td>{se['3PM']}/{se['3PA']}</td>
                        <td><strong>{se['3P%']}%</strong></td>
                        <td>{se.FTM}/{se.FTA}</td>
                        <td><strong>{se['FT%']}%</strong></td>
                        <td>{se.OReb}</td><td>{se.DReb}</td><td>{se.Reb}</td>
                        <td>{se.Ast}</td><td>{se.TOV}</td><td>{se.STL}</td><td>{se.BLK}</td><td>{se.PF}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rosters y Box Scores de Jugadores */}
          <div className="card mb-24">
            <div className="card-header">
              <div className="card-title">Estadísticas Completas por Jugador</div>
              <button className="btn btn-primary btn-sm" onClick={() => { setAddJugadorId(''); setAddLocalia(1); setAddModal(true); }}>
                + Agregar a Alineación
              </button>
            </div>
            <div className="card-body">
              {[
                { title: `Local: ${localTeamStats.NombreEquipo || 'Equipo Local'}`, list: locales },
                { title: `Visitante: ${visTeamStats.NombreEquipo || 'Equipo Visitante'}`, list: visitantes },
              ].map(({ title, list }) => (
                <div key={title} className="mb-24">
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
                    {title} ({list.length} jugadores)
                  </div>
                  {list.length > 0 ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>MIN</th>
                            <th>PTS</th>
                            <th>2PM/A</th>
                            <th>3PM/A</th>
                            <th>FTM/A</th>
                            <th>REB (O/D)</th>
                            <th>AST</th>
                            <th>STL</th>
                            <th>BLK</th>
                            <th>TOV</th>
                            <th>PF</th>
                            <th>EFF</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map(j => (
                            <tr key={j.idJugadoresPartido}>
                              <td><div className="jersey-num">{j.NumeroJugador}</div></td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{j.NombreJugador} {j.ApellidoPJugador}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.posicion || 'Posición N/A'}</div>
                              </td>
                              <td>{j.minutos || 0}'</td>
                              <td style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>{j.puntos || 0}</td>
                              <td>{j.two_pm || 0}/{j.two_pa || 0}</td>
                              <td>{j.three_pm || 0}/{j.three_pa || 0}</td>
                              <td>{j.ftm || 0}/{j.fta || 0}</td>
                              <td>{j.totalRebotes || 0} ({j.reboteOfensivo || 0}/{j.reboteDefensivo || 0})</td>
                              <td>{j.asistencia || 0}</td>
                              <td>{j.robos || 0}</td>
                              <td>{j.bloqueos || 0}</td>
                              <td>{j.perdida || 0}</td>
                              <td>{j.faltasPersonales || 0}</td>
                              <td><strong>{j.EFF || 0}</strong></td>
                              <td>
                                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveJugador(j.idJugadoresPartido)}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px' }}>Sin jugadores alineados</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Agregar Jugador a la Alineación</div>
              <button className="modal-close" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Jugador</label>
                <select className="form-select" value={addJugadorId} onChange={e => setAddJugadorId(e.target.value)}>
                  <option value="">Seleccionar jugador...</option>
                  {disponibles.map(j => (
                    <option key={j.idJugador} value={j.idJugador}>
                      #{j.NumeroJugador} {j.NombreJugador} {j.ApellidoPJugador} — {j.NombreEquipo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Condición</label>
                <select className="form-select" value={addLocalia} onChange={e => setAddLocalia(Number(e.target.value))}>
                  <option value={1}>🏠 Local</option>
                  <option value={0}>✈️ Visitante</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddJugador} disabled={saving || !addJugadorId}>
                {saving ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
