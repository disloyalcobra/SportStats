'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const empty = { NombreEquipo: '', idCategoria: '', idDeporte: '', idRama: '' };

export default function EquiposPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRama, setFilterRama] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Modal para Crear/Editar Equipo únicamente
  const [modalForm, setModalForm] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/equipos')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...empty, idDeporte: data?.catalogos?.deportes?.[0]?.idDeporte || 1 }); setEditId(null); setModalForm('create'); };
  const openEdit = (eq) => {
    setForm({
      NombreEquipo: eq.NombreEquipo,
      idCategoria: eq.idCategoria,
      idDeporte: eq.idDeporte,
      idRama: eq.idRama,
    });
    setEditId(eq.idEquipo);
    setModalForm('edit');
  };

  const handleSave = async () => {
    if (!form.NombreEquipo || !form.idCategoria || !form.idRama) return;
    setSaving(true);
    try {
      const url = editId ? `/api/equipos/${editId}` : '/api/equipos';
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setModalForm(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
    load();
  };

  const equipos = (data?.equipos || []).filter(eq => {
    const matchSearch = !search || eq.NombreEquipo.toLowerCase().includes(search.toLowerCase());
    const matchRama = !filterRama || String(eq.idRama) === filterRama;
    const matchCat = !filterCat || String(eq.idCategoria) === filterCat;
    return matchSearch && matchRama && matchCat;
  });

  const ramaBadge = (rama) => rama === 'Varonil' ? 'badge-blue' : 'badge-red';

  return (
    <AppShell
      title="Equipos"
      subtitle={`${data?.equipos?.length ?? 0} equipos registrados`}
      actions={<button className="btn btn-primary" onClick={openCreate}>+ Nuevo equipo</button>}
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando equipos...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          {/* Filtros */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex-center gap-12 flex-wrap">
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input
                    placeholder="Buscar equipo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select className="form-select" style={{ width: 160 }} value={filterRama} onChange={e => setFilterRama(e.target.value)}>
                  <option value="">Todas las ramas</option>
                  {data.catalogos.ramas.map(r => <option key={r.idRama} value={r.idRama}>{r.NombreRama}</option>)}
                </select>
                <select className="form-select" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="">Todas las categorías</option>
                  {data.catalogos.categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.NombreCategoria}</option>)}
                </select>
                {(search || filterRama || filterCat) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterRama(''); setFilterCat(''); }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grid de equipos */}
          {equipos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {equipos.map(eq => (
                <div key={eq.idEquipo} className="card" style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, #1e4a8a 100%)',
                    padding: '20px 20px 16px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div className="avatar avatar-lg" style={{ background: 'rgba(255,255,255,.15)', fontSize: 22 }}>
                      {eq.NombreEquipo?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {eq.NombreEquipo}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>
                        {eq.NombreDeporte}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div className="flex-center gap-8 mb-16">
                      <span className={`badge ${ramaBadge(eq.NombreRama)}`}>{eq.NombreRama}</span>
                      <span className="badge badge-purple">{eq.NombreCategoria}</span>
                    </div>

                    <div className="flex-center gap-12 mb-16" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      <div className="flex-center gap-4">
                        <span><strong style={{ color: 'var(--text-dark)' }}>{eq.totalJugadores}</strong> jugadores</span>
                      </div>
                      {eq.entrenadores && (
                        <div className="flex-center gap-4">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {eq.entrenadores}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-8">
                      <Link href={`/equipos/${eq.idEquipo}`} style={{ flex: 1 }}>
                        <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                          📊 Ver Ficha & Stats
                        </button>
                      </Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(eq)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(eq.idEquipo)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-title">No hay equipos</div>
                <div className="empty-state-desc">Agrega el primer equipo para comenzar</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Formulario Crear/Editar Equipo */}
      {modalForm && (
        <Modal title={modalForm === 'create' ? 'Nuevo Equipo' : 'Editar Equipo'} onClose={() => setModalForm(null)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre del Equipo *</label>
              <input className="form-input" value={form.NombreEquipo}
                onChange={e => setForm({ ...form, NombreEquipo: e.target.value })}
                placeholder="Ej. Tigres UMAD" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Rama *</label>
                <select className="form-select" value={form.idRama} onChange={e => setForm({ ...form, idRama: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {data?.catalogos?.ramas?.map(r => <option key={r.idRama} value={r.idRama}>{r.NombreRama}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Categoría *</label>
                <select className="form-select" value={form.idCategoria} onChange={e => setForm({ ...form, idCategoria: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {data?.catalogos?.categorias?.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.NombreCategoria}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Deporte</label>
              <select className="form-select" value={form.idDeporte} onChange={e => setForm({ ...form, idDeporte: e.target.value })}>
                {data?.catalogos?.deportes?.map(d => <option key={d.idDeporte} value={d.idDeporte}>{d.NombreDeporte}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModalForm(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
