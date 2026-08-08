'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

const empty = {
  NombreEntrenador: '', ApellidoPaEntrenador: '', ApellidoMaEntrenador: '',
  FechaNacimiento_entrenador: '', LugarDeOrigenEntrenador: '',
  email: '', telefono: '', equiposIds: [],
};

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function EntrenadoresPage() {
  const [data, setData] = useState({ entrenadores: [], catalogos: { equipos: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/entrenadores')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(empty);
    setEditId(null);
    setModal('create');
  };

  const openEdit = (en) => {
    const ids = en.equiposIds ? String(en.equiposIds).split(',').map(id => Number(id.trim())) : [];
    setForm({
      NombreEntrenador: en.NombreEntrenador || '',
      ApellidoPaEntrenador: en.ApellidoPaEntrenador || '',
      ApellidoMaEntrenador: en.ApellidoMaEntrenador || '',
      FechaNacimiento_entrenador: en.FechaNacimiento_entrenador || '',
      LugarDeOrigenEntrenador: en.LugarDeOrigenEntrenador || '',
      email: en.email || '',
      telefono: en.telefono || '',
      equiposIds: ids,
    });
    setEditId(en.idEntrenador);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.NombreEntrenador || !form.ApellidoPaEntrenador) {
      alert('Nombre y Apellido Paterno son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/entrenadores/${editId}` : '/api/entrenadores';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      setModal(null);
      setForm(empty);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este entrenador?')) return;
    await fetch(`/api/entrenadores/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleEquipoSelection = (idEquipo) => {
    const current = form.equiposIds || [];
    if (current.includes(idEquipo)) {
      setForm({ ...form, equiposIds: current.filter(id => id !== idEquipo) });
    } else {
      setForm({ ...form, equiposIds: [...current, idEquipo] });
    }
  };

  const calcAge = (dob) => {
    if (!dob) return '-';
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const entrenadores = data.entrenadores || [];
  const equiposCatalog = data.catalogos?.equipos || [];

  const filtered = entrenadores.filter(en => {
    const name = `${en.NombreEntrenador} ${en.ApellidoPaEntrenador}`.toLowerCase();
    const mail = (en.email || '').toLowerCase();
    return !search || name.includes(search.toLowerCase()) || mail.includes(search.toLowerCase());
  });

  return (
    <AppShell
      title="Entrenadores"
      subtitle={`${entrenadores.length} entrenadores registrados`}
      actions={<button className="btn btn-primary" onClick={openCreate}>+ Nuevo entrenador</button>}
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <>
          {/* Filtro de búsqueda */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="search-bar">
                <span className="search-icon">Q</span>
                <input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Cards de entrenadores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(en => (
              <div key={en.idEntrenador} className="card"
                style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                
                {/* Banner header */}
                <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1e4a8a 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="avatar avatar-lg" style={{ background: 'rgba(255,255,255,.15)', fontSize: 22 }}>
                    {en.NombreEntrenador?.[0]}{en.ApellidoPaEntrenador?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {en.NombreEntrenador} {en.ApellidoPaEntrenador} {en.ApellidoMaEntrenador || ''}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>
                      {en.LugarDeOrigenEntrenador || 'Sin origen'}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  {/* Contacto */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-dark)', marginBottom: 12 }}>
                    {en.email && (
                      <div className="flex-center gap-6">
                        <a href={`mailto:${en.email}`} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                          {en.email}
                        </a>
                      </div>
                    )}
                    {en.telefono && (
                      <div className="flex-center gap-6">
                        <span>{en.telefono}</span>
                      </div>
                    )}
                    {en.FechaNacimiento_entrenador && (
                      <div className="flex-center gap-6" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>{calcAge(en.FechaNacimiento_entrenador)} años</span>
                      </div>
                    )}
                  </div>

                  {/* Equipos asignados */}
                  <div style={{ borderTop: '1px solid var(--gray-bg)', paddingTop: 10, marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                      Equipos a Cargo
                    </div>
                    {en.equipos ? (
                      <div className="flex gap-6 flex-wrap">
                        {en.equipos.split(',').map((eq, i) => (
                          <span key={i} className="badge badge-blue" style={{ fontSize: 11 }}>
                            {eq.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>Sin equipo asignado</span>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-8" style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(en)}>
                      ✏️ Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(en.idEntrenador)}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-state">
                  <div className="empty-state-title">No hay entrenadores</div>
                  <div className="empty-state-desc">Agrega el primer entrenador para comenzar</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Crear / Editar */}
      {modal && (
        <Modal title={modal === 'create' ? 'Nuevo Entrenador' : 'Editar Entrenador'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Nombre(s) *</label>
                <input className="form-input" value={form.NombreEntrenador} onChange={e => setForm({ ...form, NombreEntrenador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno *</label>
                <input className="form-input" value={form.ApellidoPaEntrenador} onChange={e => setForm({ ...form, ApellidoPaEntrenador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-input" value={form.ApellidoMaEntrenador} onChange={e => setForm({ ...form, ApellidoMaEntrenador: e.target.value })} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Correo Electrónico (email)</label>
                <input className="form-input" type="email" placeholder="ejemplo@umad.edu.mx" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono de Contacto</label>
                <input className="form-input" placeholder="Ej. 2221234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fecha de Nacimiento</label>
                <input className="form-input" type="date" value={form.FechaNacimiento_entrenador} onChange={e => setForm({ ...form, FechaNacimiento_entrenador: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Lugar de Origen</label>
                <input className="form-input" value={form.LugarDeOrigenEntrenador} onChange={e => setForm({ ...form, LugarDeOrigenEntrenador: e.target.value })} />
              </div>
            </div>

            {/* Asignación de Equipos */}
            <div className="form-group mt-12">
              <label className="form-label">Equipos Asignados (EquiposEntrenadores)</label>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 10, background: 'var(--gray-bg)' }}>
                {equiposCatalog.map(eq => {
                  const checked = (form.equiposIds || []).includes(eq.idEquipo);
                  return (
                    <label key={eq.idEquipo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEquipoSelection(eq.idEquipo)}
                      />
                      <span>{eq.NombreEquipo}</span>
                    </label>
                  );
                })}
                {equiposCatalog.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No hay equipos registrados aún</div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Entrenador'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
