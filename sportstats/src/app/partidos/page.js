'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

const empty = {
  fecha: '', horaInicio: '', horaTermino: '',
  idEstadoPartido: 4, idTipoPartido: 2, ubicacion: '',
  idEquipoLocal: '', idEquipoVisitante: '',
};

function Modal({ title, onClose, children, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: maxWidth || 750 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PartidosPage() {
  const [data, setData] = useState(null);
  const [todosJugadores, setTodosJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [search, setSearch] = useState('');

  // Control de orden de rosters en el modal (camiseta vs nombre)
  const [sortRosterBy, setSortRosterBy] = useState('numero'); // 'numero' | 'nombre'

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/partidos').then(r => r.json()),
      fetch('/api/jugadores').then(r => r.json()),
    ])
      .then(([dPartidos, dJugadores]) => {
        if (dPartidos.error) setError(dPartidos.error);
        else setData(dPartidos);

        if (dJugadores.jugadores) setTodosJugadores(dJugadores.jugadores);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...empty }); setEditId(null); setModal('form'); };
  const openEdit = (p) => {
    setForm({
      fecha: p.fecha || '', horaInicio: p.horaInicio || '', horaTermino: p.horaTermino || '',
      idEstadoPartido: p.idEstadoPartido || 4, idTipoPartido: p.idTipoPartido || 2,
      ubicacion: p.ubicacion || '',
      idEquipoLocal: p.idEquipoLocal || '', idEquipoVisitante: p.idEquipoVisitante || '',
    });
    setEditId(p.idPartido);
    setModal('form');
  };

  const handleSave = async () => {
    if (!form.fecha) {
      alert('Por favor selecciona una fecha.');
      return;
    }
    if (!editId && (!form.idEquipoLocal || !form.idEquipoVisitante)) {
      alert('Debes seleccionar un Equipo Local y un Equipo Visitante.');
      return;
    }
    if (!editId && form.idEquipoLocal === form.idEquipoVisitante) {
      alert('El Equipo Local y el Equipo Visitante deben ser distintos.');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/partidos/${editId}` : '/api/partidos';
      const method = editId ? 'PUT' : 'POST';
      const payload = editId ? {
        fecha: form.fecha, horaInicio: form.horaInicio, horaTermino: form.horaTermino,
        idEstadoPartido: form.idEstadoPartido, idTipoPartido: form.idTipoPartido,
        ubicacion: form.ubicacion, localia: 1,
      } : {
        ...form,
        idEstadoPartido: form.idEstadoPartido || 4,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      setModal(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido y sus estadísticas asociadas?')) return;
    await fetch(`/api/partidos/${id}`, { method: 'DELETE' });
    load();
  };

  const estadoBadge = (e) => {
    const map = { 'Culminado': 'badge-green', 'Proximo': 'badge-blue', 'Pospuesto': 'badge-yellow', 'Anulado': 'badge-red' };
    return map[e] || 'badge-gray';
  };
  const tipoBadge = (t) => {
    const map = { 'Temporada': 'badge-blue', 'Torneo': 'badge-purple', 'Amistoso': 'badge-gray', 'Eliminatoria': 'badge-red' };
    return map[t] || 'badge-gray';
  };

  const partidos = (data?.partidos || []).filter(p => {
    const mS = !search || (p.ubicacion || '').toLowerCase().includes(search.toLowerCase())
      || (p.equipoLocal || '').toLowerCase().includes(search.toLowerCase())
      || (p.equipoVisitante || '').toLowerCase().includes(search.toLowerCase());
    const mE = !filterEstado || String(p.idEstadoPartido) === filterEstado;
    const mT = !filterTipo || String(p.idTipoPartido) === filterTipo;
    return mS && mE && mT;
  });

  // Equipos disponibles
  const equipos = data?.catalogos?.equipos || [];
  const equipoLocalSel = equipos.find(e => String(e.idEquipo) === String(form.idEquipoLocal));

  // Filtrar equipo visitante para que comparta Categoria, Rama y Deporte con el equipo local
  const visitantesDisponibles = equipos.filter(e => {
    if (String(e.idEquipo) === String(form.idEquipoLocal)) return false;
    if (!equipoLocalSel) return true;
    return e.idCategoria === equipoLocalSel.idCategoria &&
           e.idRama === equipoLocalSel.idRama &&
           e.idDeporte === equipoLocalSel.idDeporte;
  });

  // Obtener rosters para pre-vista en el modal
  const getRoster = (idEquipo) => {
    if (!idEquipo) return [];
    let list = todosJugadores.filter(j => String(j.idEquipo) === String(idEquipo) && String(j.idEstadoJugador) === '1');
    if (sortRosterBy === 'numero') {
      list = [...list].sort((a, b) => (Number(b.NumeroJugador) || 0) - (Number(a.NumeroJugador) || 0));
    } else {
      list = [...list].sort((a, b) => (a.NombreJugador || '').localeCompare(b.NombreJugador || ''));
    }
    return list;
  };

  const rosterLocal = getRoster(form.idEquipoLocal);
  const rosterVisitante = getRoster(form.idEquipoVisitante);

  return (
    <AppShell
      title="Partidos"
      subtitle={`${data?.partidos?.length ?? 0} partidos registrados`}
      actions={<button className="btn btn-primary" onClick={openCreate}>+ Nuevo partido</button>}
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando partidos...</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {data && (
        <>
          {/* Filtros */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex-center gap-12 flex-wrap">
                <div className="search-bar">
                  <span className="search-icon">&#128269;</span>
                  <input placeholder="Buscar partido o equipo..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 160 }} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {data.catalogos.estados.map(es => <option key={es.idEstadoPartido} value={es.idEstadoPartido}>{es.estadoPartido}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  {data.catalogos.tipos.map(t => <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.TipoPartido}</option>)}
                </select>
                {(search || filterEstado || filterTipo) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterEstado(''); setFilterTipo(''); }}>Limpiar</button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de partidos */}
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Equipo Local</th>
                    <th>Marcador</th>
                    <th>Equipo Visitante</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Ubicación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {partidos.map(p => {
                    const ptsLocal = p.ptsLocal;
                    const ptsVis = p.ptsVisitante;
                    const hayScore = ptsLocal !== null && ptsVis !== null && p.estadoPartido === 'Culminado';
                    return (
                      <tr key={p.idPartido}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatFecha(p.fecha)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{p.horaInicio || '—'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>Local: {p.equipoLocal || '—'}</div>
                        </td>
                        <td>
                          {hayScore ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 800, fontSize: 16 }}>
                              <span style={{ color: ptsLocal > ptsVis ? '#15803D' : 'var(--text-muted)' }}>{ptsLocal}</span>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>-</span>
                              <span style={{ color: ptsVis > ptsLocal ? '#15803D' : 'var(--text-muted)' }}>{ptsVis}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>Visitante: {p.equipoVisitante || '—'}</div>
                        </td>
                        <td><span className={`badge ${tipoBadge(p.TipoPartido)}`}>{p.TipoPartido}</span></td>
                        <td><span className={`badge ${estadoBadge(p.estadoPartido)}`}>{p.estadoPartido}</span></td>
                        <td>{p.ubicacion || '—'}</td>
                        <td>
                          <div className="flex gap-6">
                            <Link href={`/partidos/${p.idPartido}`}>
                              <button className="btn btn-primary btn-sm">Ver Match</button>
                            </Link>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.idPartido)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {partidos.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-state-title">No hay partidos</div>
                          <div className="empty-state-desc">Crea el primer partido para comenzar</div>
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

      {modal === 'form' && (
        <Modal title={editId ? 'Editar Partido' : 'Nuevo Partido (Próximo)'} onClose={() => setModal(null)}>
          <div className="modal-body">
            {/* Selección de Equipos (únicamente en Creación) */}
            {!editId && (
              <div className="card mb-16" style={{ background: 'var(--gray-bg)', padding: '16px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Seleccionar Enfrentamiento</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Equipo Local *</label>
                    <select
                      className="form-select"
                      value={form.idEquipoLocal}
                      onChange={e => setForm({ ...form, idEquipoLocal: e.target.value, idEquipoVisitante: '' })}
                    >
                      <option value="">Seleccionar Local...</option>
                      {equipos.map(eq => (
                        <option key={eq.idEquipo} value={eq.idEquipo}>
                          {eq.NombreEquipo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Equipo Visitante *</label>
                    <select
                      className="form-select"
                      value={form.idEquipoVisitante}
                      disabled={!form.idEquipoLocal}
                      onChange={e => setForm({ ...form, idEquipoVisitante: e.target.value })}
                    >
                      <option value="">Seleccionar Visitante...</option>
                      {visitantesDisponibles.map(eq => (
                        <option key={eq.idEquipo} value={eq.idEquipo}>
                          {eq.NombreEquipo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.idEquipoLocal && visitantesDisponibles.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 4 }}>
                    No hay otros equipos que compartan la misma categoría/rama/deporte con el equipo local.
                  </div>
                )}
              </div>
            )}

            {/* Vista previa del Roster de ambos equipos */}
            {!editId && form.idEquipoLocal && form.idEquipoVisitante && (
              <div className="card mb-16" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Vista Previa del Roster Activo</div>
                  <div className="flex-center gap-8" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ordenar rosters por:</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${sortRosterBy === 'numero' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setSortRosterBy('numero')}
                    >
                      # Camiseta (Mayor a Menor)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${sortRosterBy === 'nombre' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setSortRosterBy('nombre')}
                    >
                      Nombre A-Z
                    </button>
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>
                      Local ({rosterLocal.length} jugadores)
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--gray-bg)', padding: 8, borderRadius: 6 }}>
                      {rosterLocal.map(j => (
                        <div key={j.idJugador} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span><strong>#{j.NumeroJugador}</strong> {j.NombreJugador} {j.ApellidoPJugador}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{j.posicion || '-'}</span>
                        </div>
                      ))}
                      {rosterLocal.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin jugadores activos</div>}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>
                      Visitante ({rosterVisitante.length} jugadores)
                    </div>
                    <div style={{ maxHeight: 180, overflowY: 'auto', background: 'var(--gray-bg)', padding: 8, borderRadius: 6 }}>
                      {rosterVisitante.map(j => (
                        <div key={j.idJugador} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '4px 6px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <span><strong>#{j.NumeroJugador}</strong> {j.NombreJugador} {j.ApellidoPJugador}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{j.posicion || '-'}</span>
                        </div>
                      ))}
                      {rosterVisitante.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin jugadores activos</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Datos generales del partido */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fecha del Partido *</label>
                <input className="form-input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input className="form-input" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej. Gimnasio UMAD" />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Hora Inicio</label>
                <input className="form-input" type="time" value={form.horaInicio} onChange={e => setForm({ ...form, horaInicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora Término</label>
                <input className="form-input" type="time" value={form.horaTermino} onChange={e => setForm({ ...form, horaTermino: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo de Partido</label>
                <select className="form-select" value={form.idTipoPartido} onChange={e => setForm({ ...form, idTipoPartido: e.target.value })}>
                  {data?.catalogos?.tipos?.map(t => <option key={t.idTipoPartido} value={t.idTipoPartido}>{t.TipoPartido}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado Inicial</label>
                <select className="form-select" value={form.idEstadoPartido} onChange={e => setForm({ ...form, idEstadoPartido: e.target.value })}>
                  {data?.catalogos?.estados?.map(es => <option key={es.idEstadoPartido} value={es.idEstadoPartido}>{es.estadoPartido}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar y Cargar Rosters'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
