'use client';
import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

const emptyTeamStats = () => ({
  marcadorPrimerCuartoE: 0, marcadorSegundoCuartoE: 0,
  marcadorTercerCuartoE: 0, marcadorCuartoCuartoE: 0, marcadorFinalE: 0,
  '2PM': 0, '2PA': 0, '3PM': 0, '3PA': 0,
  FGM: 0, FGA: 0, FTM: 0, FTA: 0,
  OReb: 0, DReb: 0, Ast: 0, TOV: 0, STL: 0, BLK: 0, SR: 0, PF: 0,
});

const emptyPlayerStats = (idJugadoresPartido) => ({
  idJugadoresPartido, minutos: 0,
  two_pm: 0, two_pa: 0, three_pm: 0, three_pa: 0, ftm: 0, fta: 0,
  reboteOfensivo: 0, reboteDefensivo: 0, asistencia: 0,
  perdida: 0, robos: 0, bloqueos: 0, faltasPersonales: 0, PFD: 0, plus_minus: 0,
});

function calcEFF(sj) {
  const pts = (sj.two_pm || 0) * 2 + (sj.three_pm || 0) * 3 + (sj.ftm || 0);
  const reb = (sj.reboteOfensivo || 0) + (sj.reboteDefensivo || 0);
  const fgm = (sj.two_pm || 0) + (sj.three_pm || 0);
  const fga = (sj.two_pa || 0) + (sj.three_pa || 0);
  return pts + reb + (sj.asistencia || 0) + (sj.robos || 0) + (sj.bloqueos || 0)
    - ((fga - fgm) + ((sj.fta || 0) - (sj.ftm || 0)) + (sj.perdida || 0));
}

function calcPIR(sj) {
  const pts = (sj.two_pm || 0) * 2 + (sj.three_pm || 0) * 3 + (sj.ftm || 0);
  const reb = (sj.reboteOfensivo || 0) + (sj.reboteDefensivo || 0);
  const fgm = (sj.two_pm || 0) + (sj.three_pm || 0);
  const fga = (sj.two_pa || 0) + (sj.three_pa || 0);
  return pts + reb + (sj.asistencia || 0) + (sj.robos || 0) + (sj.bloqueos || 0) + (sj.PFD || 0)
    - ((fga - fgm) + ((sj.fta || 0) - (sj.ftm || 0)) + (sj.perdida || 0) + (sj.faltasPersonales || 0));
}

function numInput(value, onChange, disabled = false) {
  return (
    <input
      type="number"
      min="0"
      disabled={disabled}
      value={value || 0}
      onChange={e => onChange(Math.max(0, Number(e.target.value)))}
      style={{
        width: 50, padding: '4px 4px', textAlign: 'center', fontSize: 13,
        border: '1px solid var(--border)', borderRadius: 6,
        background: disabled ? '#F3F4F6' : 'white',
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  );
}

export default function EstadisticasPage({ params }) {
  const { id } = React.use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('local');
  const [teamStats, setTeamStats] = useState({ local: null, visitante: null });
  const [playerStats, setPlayerStats] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/partidos/${id}`).then(r => r.json()),
      fetch(`/api/estadisticas?idPartido=${id}`).then(r => r.json()),
    ]).then(([pd, sd]) => {
      if (pd.error) { setError(pd.error); return; }
      setData(pd);

      // Build local/visitante split
      const locales = pd.alineacion.filter(j => j.Localia === 1 || j.Localia === true);
      const visitantes = pd.alineacion.filter(j => j.Localia === 0 || j.Localia === false);

      // Cargar stats existentes del partido o inicializar vacías
      const seLocal = sd.statsEquipo?.find(s => locales.find(l => l.idEquipo === s.idEquipo)) || null;
      const seVis = sd.statsEquipo?.find(s => visitantes.find(v => v.idEquipo === s.idEquipo)) || null;

      setTeamStats({
        local: seLocal ? { ...emptyTeamStats(), ...seLocal } : { ...emptyTeamStats(), idEquipo: locales[0]?.idEquipo },
        visitante: seVis ? { ...emptyTeamStats(), ...seVis } : { ...emptyTeamStats(), idEquipo: visitantes[0]?.idEquipo },
      });

      // Player stats
      const ps = {};
      for (const j of pd.alineacion) {
        const existing = sd.statsJugador?.find(s => s.idJugadoresPartido === j.idJugadoresPartido);
        ps[j.idJugadoresPartido] = existing ? { ...emptyPlayerStats(j.idJugadoresPartido), ...existing } : emptyPlayerStats(j.idJugadoresPartido);
      }
      setPlayerStats(ps);
    })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const updateTeam = (side, field, value) => {
    setTeamStats(prev => ({ ...prev, [side]: { ...prev[side], [field]: Number(value) } }));
  };

  const updatePlayer = (idJP, field, value) => {
    setPlayerStats(prev => ({ ...prev, [idJP]: { ...prev[idJP], [field]: Number(value) } }));
  };

  const handleSave = async (side) => {
    const ts = teamStats[side];
    if (!ts?.idEquipo) { setError('El equipo no está definido. Asegúrate de que hay estadísticas de equipo disponibles.'); return; }
    setSaving(true);
    setError(null);
    try {
      const jugadores = data.alineacion.filter(j =>
        side === 'local' ? (j.Localia === 1 || j.Localia === true) : (j.Localia === 0 || j.Localia === false)
      );
      const statsJugadores = jugadores.map(j => playerStats[j.idJugadoresPartido]).filter(Boolean);

      await fetch('/api/estadisticas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPartido: id,
          idEquipo: ts.idEquipo,
          statsEquipo: ts,
          statsJugadores,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const partido = data?.partido;
  const locales = data?.alineacion?.filter(j => j.Localia === 1 || j.Localia === true) || [];
  const visitantes = data?.alineacion?.filter(j => j.Localia === 0 || j.Localia === false) || [];

  const currentJugadores = tab === 'local' ? locales : visitantes;
  const currentSide = tab;
  const currentTeam = teamStats[currentSide];

  const isCulminado = partido?.estadoPartido === 'Culminado' || Number(partido?.idEstadoPartido) === 1;
  const isEditable = !isCulminado;

  const TeamInput = ({ field, label }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{label}</div>
      <input
        type="number" min="0"
        disabled={!isEditable}
        value={currentTeam?.[field] || 0}
        onChange={e => updateTeam(currentSide, field, e.target.value)}
        style={{
          width: 64, padding: '6px 4px', textAlign: 'center', fontSize: 15, fontWeight: 600,
          border: '1px solid var(--border)', borderRadius: 8,
          background: !isEditable ? '#F3F4F6' : 'white',
          cursor: !isEditable ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );

  return (
    <AppShell
      title="Captura de Estadísticas"
      subtitle={partido ? `${partido.TipoPartido} — ${partido.fecha}` : ''}
      actions={
        <div className="flex gap-8">
          <Link href={`/partidos/${id}`}>
            <button className="btn btn-ghost">← Volver al Partido</button>
          </Link>
          <button className="btn btn-primary" onClick={() => handleSave(tab)} disabled={saving || !isEditable}>
            {saving ? 'Guardando...' : 'Guardar Estadísticas'}
          </button>
        </div>
      }
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando...</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {saved && <div className="alert alert-success">Estadísticas guardadas correctamente</div>}

      {!isEditable && partido && (
        <div className="alert alert-warning mb-24" style={{ background: '#FFFBEB', borderColor: '#F59E0B', color: '#B45309', padding: '16px 20px', borderRadius: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Edición Deshabilitada</div>
          <div>
            El partido actual está en estado <strong>"{partido.estadoPartido}"</strong>. No se permite capturar o modificar la información cuando el partido ya ha finalizado.
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Tabs local/visitante */}
          <div className="tabs">
            <button className={`tab-btn ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>
              Local ({locales[0]?.NombreEquipo || 'Equipo A'}) — {locales.length} jugadores
            </button>
            <button className={`tab-btn ${tab === 'visitante' ? 'active' : ''}`} onClick={() => setTab('visitante')}>
              Visitante ({visitantes[0]?.NombreEquipo || 'Equipo B'}) — {visitantes.length} jugadores
            </button>
          </div>

          {/* Stats de equipo */}
          <div className="card mb-24">
            <div className="card-header">
              <div className="card-title">Box Score del Equipo</div>
              <div className="flex gap-8">
                {currentTeam && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    PTS calculados: <strong style={{ color: 'var(--primary)' }}>
                      {(currentTeam['2PM'] || 0) * 2 + (currentTeam['3PM'] || 0) * 3 + (currentTeam['FTM'] || 0)}
                    </strong>
                  </div>
                )}
              </div>
            </div>
            {currentTeam && (
              <div className="card-body">
                {/* Marcador por cuartos */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Marcador por cuartos
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      ['marcadorPrimerCuartoE', '1Q'],
                      ['marcadorSegundoCuartoE', '2Q'],
                      ['marcadorTercerCuartoE', '3Q'],
                      ['marcadorCuartoCuartoE', '4Q'],
                      ['marcadorFinalE', 'FINAL'],
                    ].map(([field, label]) => (
                      <TeamInput key={field} field={field} label={label} />
                    ))}
                  </div>
                </div>

                {/* Tiros */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Tiros de campo
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {[['2PM', '2PM'], ['2PA', '2PA'], ['3PM', '3PM'], ['3PA', '3PA'], ['FTM', 'FTM'], ['FTA', 'FTA']].map(([field, label]) => (
                      <TeamInput key={field} field={field} label={label} />
                    ))}
                    <div style={{ textAlign: 'center', padding: '4px 12px', background: 'var(--primary-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--primary-mid)', fontWeight: 700, marginBottom: 2 }}>FG%</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                        {(currentTeam['2PA'] || 0) + (currentTeam['3PA'] || 0) > 0
                          ? Math.round(((currentTeam['2PM'] || 0) + (currentTeam['3PM'] || 0)) / ((currentTeam['2PA'] || 0) + (currentTeam['3PA'] || 0)) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '4px 12px', background: 'var(--primary-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--primary-mid)', fontWeight: 700, marginBottom: 2 }}>3P%</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                        {(currentTeam['3PA'] || 0) > 0 ? Math.round((currentTeam['3PM'] || 0) / (currentTeam['3PA'] || 0) * 100) : 0}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '4px 12px', background: 'var(--primary-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--primary-mid)', fontWeight: 700, marginBottom: 2 }}>FT%</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                        {(currentTeam['FTA'] || 0) > 0 ? Math.round((currentTeam['FTM'] || 0) / (currentTeam['FTA'] || 0) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas adicionales */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Estadísticas adicionales
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[['OReb', 'OReb'], ['DReb', 'DReb'], ['Ast', 'AST'], ['TOV', 'TOV'], ['STL', 'STL'], ['BLK', 'BLK'], ['SR', 'SR'], ['PF', 'PF']].map(([field, label]) => (
                      <TeamInput key={field} field={field} label={label} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats de jugadores */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Estadísticas por Jugador</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentJugadores.length} jugadores</div>
            </div>
            {currentJugadores.length > 0 ? (
              <div className="table-wrapper">
                <table style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>MIN</th>
                      <th>2PM</th><th>2PA</th>
                      <th>3PM</th><th>3PA</th>
                      <th>FTM</th><th>FTA</th>
                      <th>OReb</th><th>DReb</th>
                      <th>AST</th><th>TOV</th><th>ROB</th><th>BLK</th>
                      <th>PF</th><th>PFD</th><th>+/-</th>
                      <th style={{ background: 'var(--primary-light)', color: 'var(--primary-mid)' }}>PTS</th>
                      <th style={{ background: 'var(--primary-light)', color: 'var(--primary-mid)' }}>EFF</th>
                      <th style={{ background: 'var(--primary-light)', color: 'var(--primary-mid)' }}>PIR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentJugadores.map(j => {
                      const sj = playerStats[j.idJugadoresPartido] || emptyPlayerStats(j.idJugadoresPartido);
                      const pts = (sj.two_pm || 0) * 2 + (sj.three_pm || 0) * 3 + (sj.ftm || 0);
                      const eff = calcEFF(sj);
                      const pir = calcPIR(sj);
                      const update = (field, val) => updatePlayer(j.idJugadoresPartido, field, val);
                      return (
                        <tr key={j.idJugadoresPartido}>
                          <td>
                            <div className="flex-center gap-6">
                              <div className="jersey-num" style={{ width: 26, height: 26, fontSize: 11 }}>{j.NumeroJugador}</div>
                              <div style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600 }}>{j.NombreJugador} {j.ApellidoPJugador}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{j.posicion}</div>
                              </div>
                            </div>
                          </td>
                          <td>{numInput(sj.minutos, v => update('minutos', v), !isEditable)}</td>
                          <td>{numInput(sj.two_pm, v => update('two_pm', v), !isEditable)}</td>
                          <td>{numInput(sj.two_pa, v => update('two_pa', v), !isEditable)}</td>
                          <td>{numInput(sj.three_pm, v => update('three_pm', v), !isEditable)}</td>
                          <td>{numInput(sj.three_pa, v => update('three_pa', v), !isEditable)}</td>
                          <td>{numInput(sj.ftm, v => update('ftm', v), !isEditable)}</td>
                          <td>{numInput(sj.fta, v => update('fta', v), !isEditable)}</td>
                          <td>{numInput(sj.reboteOfensivo, v => update('reboteOfensivo', v), !isEditable)}</td>
                          <td>{numInput(sj.reboteDefensivo, v => update('reboteDefensivo', v), !isEditable)}</td>
                          <td>{numInput(sj.asistencia, v => update('asistencia', v), !isEditable)}</td>
                          <td>{numInput(sj.perdida, v => update('perdida', v), !isEditable)}</td>
                          <td>{numInput(sj.robos, v => update('robos', v), !isEditable)}</td>
                          <td>{numInput(sj.bloqueos, v => update('bloqueos', v), !isEditable)}</td>
                          <td>{numInput(sj.faltasPersonales, v => update('faltasPersonales', v), !isEditable)}</td>
                          <td>{numInput(sj.PFD, v => update('PFD', v), !isEditable)}</td>
                          <td>
                            <input type="number" value={sj.plus_minus || 0}
                              disabled={!isEditable}
                              onChange={e => update('plus_minus', Number(e.target.value))}
                              style={{ width: 50, padding: '4px 4px', textAlign: 'center', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: !isEditable ? '#F3F4F6' : 'white', cursor: !isEditable ? 'not-allowed' : 'text' }}
                            />
                          </td>
                          <td style={{ fontWeight: 800, fontSize: 16, color: 'var(--primary)', textAlign: 'center', background: 'var(--primary-light)' }}>{pts}</td>
                          <td style={{ fontWeight: 700, textAlign: 'center', color: eff >= 0 ? '#15803D' : '#DC2626', background: 'var(--primary-light)' }}>{eff}</td>
                          <td style={{ fontWeight: 700, textAlign: 'center', color: pir >= 0 ? '#15803D' : '#DC2626', background: 'var(--primary-light)' }}>{pir}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-body">
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-title">Sin jugadores en la alineación</div>
                  <div className="empty-state-desc">
                    <Link href={`/partidos/${id}`}>Agrega jugadores al partido</Link> para capturar sus estadísticas
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
