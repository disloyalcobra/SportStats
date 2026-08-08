'use client';
import { useState, useEffect, Suspense } from 'react';
import AppShell from '@/components/AppShell';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const empty = {
  NombreJugador: '', ApellidoPJugador: '', ApellidoMJugador: '',
  FechaNacimiento: '', EstaturaJugador: '', PesoJugador: '',
  SemestreJugador: '', NumeroJugador: '', idPosicion: '',
  idEquipo: '', idEstadoJugador: 1, LugarDeOrigenJugador: '',
};

function Modal({ title, onClose, children, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: maxWidth || 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function JugadoresContent() {
  const searchParams = useSearchParams();
  const equipoFiltro = searchParams.get('equipo');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterEquipo, setFilterEquipo] = useState(equipoFiltro || '');
  const [filterEstado, setFilterEstado] = useState('');

  // Modal Formulario Crear/Editar Jugador únicamente
  const [modalForm, setModalForm] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/jugadores')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...empty, idEquipo: filterEquipo || data?.catalogos?.equipos?.[0]?.idEquipo || '' });
    setEditId(null);
    setModalForm('form');
  };

  const openEdit = (j) => {
    setForm({
      NombreJugador: j.NombreJugador, ApellidoPJugador: j.ApellidoPJugador,
      ApellidoMJugador: j.ApellidoMJugador, FechaNacimiento: j.FechaNacimiento,
      EstaturaJugador: j.EstaturaJugador, PesoJugador: j.PesoJugador,
      SemestreJugador: j.SemestreJugador, NumeroJugador: j.NumeroJugador,
      idPosicion: j.idPosicion, idEquipo: j.idEquipo,
      idEstadoJugador: j.idEstadoJugador, LugarDeOrigenJugador: j.LugarDeOrigenJugador,
    });
    setEditId(j.idJugador);
    setModalForm('form');
  };

  const handleSave = async () => {
    if (!form.NombreJugador || !form.ApellidoPJugador || !form.idEquipo) return;
    setSaving(true);
    try {
      const url = editId ? `/api/jugadores/${editId}` : '/api/jugadores';
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setModalForm(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este jugador?')) return;
    await fetch(`/api/jugadores/${id}`, { method: 'DELETE' });
    load();
  };

  const jugadores = (data?.jugadores || []).filter(j => {
    const name = `${j.NombreJugador} ${j.ApellidoPJugador}`.toLowerCase();
    const mS = !search || name.includes(search.toLowerCase());
    const mE = !filterEquipo || String(j.idEquipo) === filterEquipo;
    const mEs = !filterEstado || String(j.idEstadoJugador) === filterEstado;
    return mS && mE && mEs;
  });

  const estadoClass = (e) => {
    const map = { 'Activo': 'badge-green', 'Inactivo': 'badge-gray', 'Lesionado': 'badge-red', 'Baja': 'badge-yellow' };
    return map[e] || 'badge-gray';
  };

  const calcAge = (dob) => {
    if (!dob) return '-';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <AppShell
      title="Jugadores"
      subtitle={`${jugadores.length} jugadores registrados`}
      actions={<button className="btn btn-primary" onClick={openCreate}>+ Nuevo jugador</button>}
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando jugadores...</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {data && (
        <>
          {/* Filtros */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex-center gap-12 flex-wrap">
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input placeholder="Buscar jugador..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 200 }} value={filterEquipo} onChange={e => setFilterEquipo(e.target.value)}>
                  <option value="">Todos los equipos</option>
                  {data.catalogos.equipos.map(eq => <option key={eq.idEquipo} value={eq.idEquipo}>{eq.NombreEquipo}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {data.catalogos.estados.map(es => <option key={es.idEstadoJugador} value={es.idEstadoJugador}>{es.Estado}</option>)}
                </select>
                {(search || filterEquipo || filterEstado) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterEquipo(''); setFilterEstado(''); }}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Posición</th>
                    <th>Equipo</th>
                    <th>Edad</th>
                    <th>Estatura</th>
                    <th>Semestre</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {jugadores.map(j => (
                    <tr key={j.idJugador}>
                      <td><div className="jersey-num">{j.NumeroJugador}</div></td>
                      <td>
                        <Link href={`/jugadores/${j.idJugador}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="flex-center gap-10">
                            <div className="avatar">
                              {j.NombreJugador?.[0]}{j.ApellidoPJugador?.[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{j.NombreJugador} {j.ApellidoPJugador} {j.ApellidoMJugador}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.LugarDeOrigenJugador}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td><span className="badge badge-gray">{j.posicion || '-'}</span></td>
                      <td>{j.NombreEquipo}</td>
                      <td>{calcAge(j.FechaNacimiento)} años</td>
                      <td>{j.EstaturaJugador ? `${j.EstaturaJugador}m` : '-'}</td>
                      <td>{j.SemestreJugador}°</td>
                      <td><span className={`badge ${estadoClass(j.estadoNombre)}`}>{j.estadoNombre}</span></td>
                      <td>
                        <div className="flex gap-6">
                          <Link href={`/jugadores/${j.idJugador}`}>
                            <button className="btn btn-primary btn-sm">
                              📊 Ver Ficha & Stats
                            </button>
                          </Link>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(j)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(j.idJugador)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jugadores.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👤</div>
                          <div className="empty-state-title">No hay jugadores</div>
                          <div className="empty-state-desc">Agrega el primer jugador para comenzar</div>
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

      {/* Modal Formulario Crear/Editar Jugador */}
      {modalForm === 'form' && (
        <Modal title={editId ? 'Editar Jugador' : 'Nuevo Jugador'} onClose={() => setModalForm(null)}>
          <div className="modal-body">
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Nombre(s) *</label>
                <input className="form-input" value={form.NombreJugador} onChange={e => setForm({ ...form, NombreJugador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno *</label>
                <input className="form-input" value={form.ApellidoPJugador} onChange={e => setForm({ ...form, ApellidoPJugador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-input" value={form.ApellidoMJugador} onChange={e => setForm({ ...form, ApellidoMJugador: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fecha de Nacimiento</label>
                <input className="form-input" type="date" value={form.FechaNacimiento} onChange={e => setForm({ ...form, FechaNacimiento: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Lugar de Origen</label>
                <input className="form-input" value={form.LugarDeOrigenJugador} onChange={e => setForm({ ...form, LugarDeOrigenJugador: e.target.value })} />
              </div>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Estatura (m)</label>
                <input className="form-input" type="number" step=".01" value={form.EstaturaJugador} onChange={e => setForm({ ...form, EstaturaJugador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Peso (kg)</label>
                <input className="form-input" type="number" step=".1" value={form.PesoJugador} onChange={e => setForm({ ...form, PesoJugador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Semestre</label>
                <input className="form-input" type="number" min="1" max="12" value={form.SemestreJugador} onChange={e => setForm({ ...form, SemestreJugador: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Número de Camiseta</label>
                <input className="form-input" type="number" value={form.NumeroJugador} onChange={e => setForm({ ...form, NumeroJugador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Posición</label>
                <select className="form-select" value={form.idPosicion} onChange={e => setForm({ ...form, idPosicion: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {data?.catalogos?.posiciones?.map(p => <option key={p.idPosicion} value={p.idPosicion}>{p.Nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Equipo *</label>
                <select className="form-select" value={form.idEquipo} onChange={e => setForm({ ...form, idEquipo: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {data?.catalogos?.equipos?.map(eq => <option key={eq.idEquipo} value={eq.idEquipo}>{eq.NombreEquipo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.idEstadoJugador} onChange={e => setForm({ ...form, idEstadoJugador: e.target.value })}>
                  {data?.catalogos?.estados?.map(es => <option key={es.idEstadoJugador} value={es.idEstadoJugador}>{es.Estado}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModalForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

export default function JugadoresPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /> Cargando...</div>}>
      <JugadoresContent />
    </Suspense>
  );
}
