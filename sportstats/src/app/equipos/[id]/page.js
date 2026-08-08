'use client';
import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function Modal({ title, onClose, children, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: maxWidth || 550 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'general', label: 'Estadísticas Generales' },
  { key: 'partido', label: 'Por Partido' },
  { key: 'plantilla', label: 'Plantilla' },
];

export default function EquipoDetallePage({ params }) {
  const { id } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTipoPartido, setFilterTipoPartido] = useState('');

  // Plantilla state
  const [plantillaData, setPlantillaData] = useState(null);
  const [plantillaLoading, setPlantillaLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [addPlayerId, setAddPlayerId] = useState('');
  const [savingPlayer, setSavingPlayer] = useState(false);

  const loadStats = (year = filterYear, tipo = filterTipoPartido) => {
    setLoading(true);
    let url = `/api/equipos/${id}/stats?`;
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

  const loadPlantilla = () => {
    setPlantillaLoading(true);
    Promise.all([
      fetch(`/api/jugadores?idEquipo=${id}`).then(r => r.json()),
      fetch('/api/jugadores').then(r => r.json()),
    ])
      .then(([teamPlayers, allPlayersData]) => {
        setPlantillaData(teamPlayers);
        setAllPlayers(allPlayersData.jugadores || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setPlantillaLoading(false));
  };

  useEffect(() => { loadStats('', ''); }, [id]);

  useEffect(() => {
    if (activeTab === 'plantilla' && !plantillaData) {
      loadPlantilla();
    }
  }, [activeTab]);

  const handleRemovePlayer = async (playerId) => {
    if (!confirm('¿Mover este jugador fuera del equipo? Se quedará sin equipo asignado.')) return;
    await fetch(`/api/jugadores/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idEquipo: null, _removeFromTeam: true }),
    });
    loadPlantilla();
  };

  const handleAddPlayer = async () => {
    if (!addPlayerId) return;
    setSavingPlayer(true);
    try {
      const player = allPlayers.find(j => String(j.idJugador) === String(addPlayerId));
      if (!player) return;
      await fetch(`/api/jugadores/${addPlayerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NombreJugador: player.NombreJugador,
          ApellidoPJugador: player.ApellidoPJugador,
          ApellidoMJugador: player.ApellidoMJugador,
          FechaNacimiento: player.FechaNacimiento,
          EstaturaJugador: player.EstaturaJugador,
          PesoJugador: player.PesoJugador,
          SemestreJugador: player.SemestreJugador,
          NumeroJugador: player.NumeroJugador,
          idPosicion: player.idPosicion,
          idEquipo: id,
          idEstadoJugador: player.idEstadoJugador,
          LugarDeOrigenJugador: player.LugarDeOrigenJugador,
        }),
      });
      setShowAddModal(false);
      setAddPlayerId('');
      loadPlantilla();
    } finally {
      setSavingPlayer(false);
    }
  };

  const equipo = data?.equipo;
  const resumen = data?.resumenGeneral;
  const partidos = data?.partidos || [];
  const filtros = data?.filtros || { anios: [], tiposPartido: [] };
  const matchSelected = partidos.find(p => String(p.idPartido) === String(selectedMatchId));

  const teamPlayers = plantillaData?.jugadores || [];
  const availablePlayers = allPlayers.filter(j =>
    String(j.idEquipo) !== String(id) &&
    !teamPlayers.find(tp => tp.idJugador === j.idJugador)
  );

  const estadoClass = (e) => {
    const map = { 'Activo': 'badge-green', 'Inactivo': 'badge-gray', 'Lesionado': 'badge-red', 'Baja': 'badge-yellow' };
    return map[e] || 'badge-gray';
  };

  const calcAge = (dob) => {
    if (!dob) return '-';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <AppShell
      title={equipo ? equipo.NombreEquipo : 'Ficha de Equipo'}
      subtitle={equipo ? `${equipo.NombreDeporte} · Categoría ${equipo.NombreCategoria} · Rama ${equipo.NombreRama}` : ''}
      actions={
        <Link href="/equipos">
          <button className="btn btn-ghost">← Volver a Equipos</button>
        </Link>
      }
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando ficha del equipo...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && equipo && (
        <>
          {/* Header Banner */}
          <div className="card mb-24" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', color: 'white', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div className="flex-center gap-16">
                <div className="avatar avatar-lg" style={{ background: 'rgba(255,255,255,0.15)', fontSize: 28, width: 64, height: 64, color: 'white' }}>
                  {equipo.NombreEquipo?.[0]}
                </div>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>{equipo.NombreEquipo}</h1>
                  <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                    {equipo.NombreDeporte} — {equipo.NombreCategoria} ({equipo.NombreRama})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs mb-24">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtros de Período (solo para stats) */}
          {(activeTab === 'general' || activeTab === 'partido') && (
            <div className="card mb-24">
              <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
                <div className="flex-center gap-16 flex-wrap">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Filtros de Período:</span>
                  <select
                    className="form-select"
                    style={{ width: 160 }}
                    value={filterYear}
                    onChange={e => { setFilterYear(e.target.value); loadStats(e.target.value, filterTipoPartido); }}
                  >
                    <option value="">Todos los años</option>
                    {filtros.anios.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    className="form-select"
                    style={{ width: 180 }}
                    value={filterTipoPartido}
                    onChange={e => { setFilterTipoPartido(e.target.value); loadStats(filterYear, e.target.value); }}
                  >
                    <option value="">Todos los tipos</option>
                    {filtros.tiposPartido.map(t => (
                      <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.TipoPartido}</option>
                    ))}
                  </select>
                  {(filterYear || filterTipoPartido) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFilterYear(''); setFilterTipoPartido(''); loadStats('', ''); }}>
                      Limpiar Filtros
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: GENERAL */}
          {activeTab === 'general' && resumen && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PARTIDOS JUGADOS</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-dark)', margin: '6px 0' }}>{resumen.totalPartidos}</div>
                  <div style={{ fontSize: 12, color: '#15803D', fontWeight: 700 }}>{resumen.victorias} Victorias - {resumen.derrotas} Derrotas</div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>PPG (PTS FAVOR / CONTRA)</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--primary)', margin: '6px 0' }}>{resumen.promedios.ptsFavor}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recibidos: <strong>{resumen.promedios.ptsContra}</strong> PPG</div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>EFECTIVIDAD FG%</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', margin: '6px 0' }}>{resumen.promedios.pctFG}%</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>3P%: <strong>{resumen.promedios.pct3P}%</strong> | FT%: <strong>{resumen.promedios.pctFT}%</strong></div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>REBOTES / ASISTENCIAS</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#8b5cf6', margin: '6px 0' }}>{resumen.promedios.rebotes} / {resumen.promedios.asistencias}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>STL: <strong>{resumen.promedios.robos}</strong> | BLK: <strong>{resumen.promedios.bloqueos}</strong></div>
                </div>
              </div>

              <div className="card mb-24">
                <div className="card-header">
                  <div className="card-title">Estadísticas Acumuladas del Equipo</div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>PTS Favor</th><th>PTS Contra</th><th>2PM/A</th><th>3PM/A</th><th>FTM/A</th>
                        <th>Rebotes</th><th>Asistencias</th><th>Robos</th><th>Bloqueos</th><th>Pérdidas</th><th>Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>{resumen.totales.totalPts}</td>
                        <td style={{ fontWeight: 700 }}>{resumen.totales.totalPtsRival}</td>
                        <td>{resumen.totales.total2PM}/{resumen.totales.total2PA}</td>
                        <td>{resumen.totales.total3PM}/{resumen.totales.total3PA}</td>
                        <td>{resumen.totales.totalFTM}/{resumen.totales.totalFTA}</td>
                        <td>{resumen.totales.totalReb} ({resumen.totales.totalOReb}/{resumen.totales.totalDReb})</td>
                        <td>{resumen.totales.totalAst}</td>
                        <td>{resumen.totales.totalSTL}</td>
                        <td>{resumen.totales.totalBLK}</td>
                        <td>{resumen.totales.totalTOV}</td>
                        <td>{resumen.totales.totalPF}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB: POR PARTIDO */}
          {activeTab === 'partido' && (
            <>
              <div className="card mb-24">
                <div className="card-body">
                  <div className="form-group mb-0">
                    <label className="form-label">Seleccionar Partido del Historial</label>
                    <select
                      className="form-select"
                      value={selectedMatchId}
                      onChange={e => setSelectedMatchId(e.target.value)}
                    >
                      {partidos.map(p => (
                        <option key={p.idPartido} value={p.idPartido}>
                          {p.fecha} — vs {String(p.idLocal) === String(id) ? p.equipoVisitante : p.equipoLocal} ({p.ptsPropios} pts) [{p.estadoPartido}]
                        </option>
                      ))}
                      {partidos.length === 0 && <option value="">Sin partidos registrados en este período</option>}
                    </select>
                  </div>
                </div>
              </div>

              {matchSelected ? (
                <>
                  <div className="card mb-24" style={{ background: 'var(--gray-bg)', padding: '20px' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Resultado y Desglose por Cuartos</span>
                      <span className="badge badge-blue">{matchSelected.TipoPartido} · {formatFecha(matchSelected.fecha)}</span>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Equipo</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Marcador Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: String(matchSelected.idLocal) === String(id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                            <td style={{ fontWeight: 800 }}>Local: {matchSelected.equipoLocal}</td>
                            <td>{matchSelected.marcadorPrimerCuartoE || 0}</td>
                            <td>{matchSelected.marcadorSegundoCuartoE || 0}</td>
                            <td>{matchSelected.marcadorTercerCuartoE || 0}</td>
                            <td>{matchSelected.marcadorCuartoCuartoE || 0}</td>
                            <td style={{ fontWeight: 900, fontSize: 18, color: 'var(--primary)' }}>{matchSelected.ptsLocal}</td>
                          </tr>
                          <tr style={{ background: String(matchSelected.idVisitante) === String(id) ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                            <td style={{ fontWeight: 800 }}>Visitante: {matchSelected.equipoVisitante}</td>
                            <td>-</td><td>-</td><td>-</td><td>-</td>
                            <td style={{ fontWeight: 900, fontSize: 18, color: 'var(--primary)' }}>{matchSelected.ptsVisitante}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Roster y Boxscore de Jugadores en este Partido</div>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th><th>Jugador</th><th>MIN</th><th>PTS</th><th>2PM/A</th><th>3PM/A</th><th>FTM/A</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>EFF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchSelected.roster?.map(j => (
                            <tr key={j.idEstadisticasJugador}>
                              <td><div className="jersey-num">{j.NumeroJugador}</div></td>
                              <td>
                                <Link href={`/jugadores/${j.idJugador}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{j.NombreJugador} {j.ApellidoPJugador}</span>
                                </Link>
                              </td>
                              <td>{j.minutos}'</td>
                              <td style={{ fontWeight: 900, fontSize: 15, color: 'var(--primary)' }}>{j.puntos}</td>
                              <td>{j.two_pm}/{j.two_pa}</td>
                              <td>{j.three_pm}/{j.three_pa}</td>
                              <td>{j.ftm}/{j.fta}</td>
                              <td>{j.totalRebotes}</td>
                              <td>{j.asistencia}</td>
                              <td>{j.robos}</td>
                              <td>{j.bloqueos}</td>
                              <td>{j.perdida}</td>
                              <td><strong>{j.EFF}</strong></td>
                            </tr>
                          ))}
                          {(!matchSelected.roster || matchSelected.roster.length === 0) && (
                            <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin estadísticas individuales para este partido</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-title">Sin partidos seleccionados</div>
                    <div className="empty-state-desc">Selecciona un partido del menú desplegable arriba para ver su detalle</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: PLANTILLA */}
          {activeTab === 'plantilla' && (
            <>
              {plantillaLoading && <div className="loading"><div className="spinner" /> Cargando plantilla...</div>}
              {!plantillaLoading && (
                <>
                  <div className="card mb-0">
                    <div className="card-header">
                      <div className="card-title">Plantilla del Equipo ({teamPlayers.length} jugadores)</div>
                      <button className="btn btn-primary btn-sm" onClick={() => { setAddPlayerId(''); setShowAddModal(true); }}>
                        + Agregar Jugador
                      </button>
                    </div>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>Posición</th>
                            <th>Edad</th>
                            <th>Estatura</th>
                            <th>Semestre</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map(j => (
                            <tr key={j.idJugador}>
                              <td><div className="jersey-num">{j.NumeroJugador}</div></td>
                              <td>
                                <Link href={`/jugadores/${j.idJugador}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                  <div className="flex-center gap-10">
                                    <div className="avatar">{j.NombreJugador?.[0]}{j.ApellidoPJugador?.[0]}</div>
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{j.NombreJugador} {j.ApellidoPJugador} {j.ApellidoMJugador}</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.LugarDeOrigenJugador || '—'}</div>
                                    </div>
                                  </div>
                                </Link>
                              </td>
                              <td><span className="badge badge-gray">{j.posicion || '-'}</span></td>
                              <td>{calcAge(j.FechaNacimiento)} años</td>
                              <td>{j.EstaturaJugador ? `${j.EstaturaJugador}m` : '-'}</td>
                              <td>{j.SemestreJugador}°</td>
                              <td><span className={`badge ${estadoClass(j.estadoNombre)}`}>{j.estadoNombre}</span></td>
                              <td>
                                <div className="flex gap-6">
                                  <Link href={`/jugadores/${j.idJugador}`}>
                                    <button className="btn btn-primary btn-sm">📊 Ver Stats</button>
                                  </Link>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleRemovePlayer(j.idJugador)}>
                                    Quitar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {teamPlayers.length === 0 && (
                            <tr>
                              <td colSpan={8}>
                                <div className="empty-state">
                                  <div className="empty-state-title">Sin jugadores en la plantilla</div>
                                  <div className="empty-state-desc">Agrega jugadores usando el botón de arriba</div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Modal Agregar Jugador a Equipo */}
      {showAddModal && (
        <Modal title="Agregar Jugador al Equipo" onClose={() => setShowAddModal(false)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Jugador disponible</label>
              <select className="form-select" value={addPlayerId} onChange={e => setAddPlayerId(e.target.value)}>
                <option value="">Seleccionar jugador...</option>
                {availablePlayers.map(j => (
                  <option key={j.idJugador} value={j.idJugador}>
                    #{j.NumeroJugador} {j.NombreJugador} {j.ApellidoPJugador} {j.NombreEquipo ? `— (actualmente en: ${j.NombreEquipo})` : '— (sin equipo)'}
                  </option>
                ))}
              </select>
              {availablePlayers.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  No hay jugadores disponibles para agregar.
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAddPlayer} disabled={savingPlayer || !addPlayerId}>
              {savingPlayer ? 'Guardando...' : 'Agregar al Equipo'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
