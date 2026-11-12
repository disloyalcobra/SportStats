'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { FORMATOS, MAX_EQUIPOS, nextPow2 } from '@/lib/torneos';
import { COMPETICIONES, rutaCompeticion, rangoFechas } from './config';

const formatoBadge = { eliminacion: 'badge-red', liga: 'badge-blue', grupos: 'badge-purple' };
const OPCIONES_PLAYOFFS = [0, 2, 4, 6, 8, 16];

const inicial = {
  nombre: '', formato: 'eliminacion', idDeporte: '', fechaInicio: '', fechaFin: '', equipos: [],
  sorteo: false, idaVuelta: false, puntosVictoria: 3, puntosEmpate: 1, puntosDerrota: 0,
  numGrupos: 2, clasificanPorGrupo: 2, playoffs: 4,
};

const rondasDe = (n) => Math.log2(nextPow2(Math.max(2, n)));

/** Texto que explica lo que se va a generar con la configuración actual. */
function resumen(tipo, form) {
  const n = form.equipos.length;
  const vueltas = form.idaVuelta ? 2 : 1;
  const jornadas = (n % 2 === 0 ? n - 1 : n) * vueltas;
  const partidosLiga = (n * (n - 1) / 2) * vueltas;

  if (tipo === 'temporada') {
    if (n < 2) return 'Selecciona al menos 2 equipos.';
    const po = Number(form.playoffs);
    let txt = `Temporada regular: ${jornadas} jornadas y ${partidosLiga} partidos.`;
    if (po > n) return `${txt} Los playoffs no pueden tener más equipos (${po}) que la temporada (${n}).`;
    if (po >= 2) txt += ` Playoffs con los ${po} mejores: ${rondasDe(po)} ronda${rondasDe(po) > 1 ? 's' : ''}.`;
    return txt;
  }

  if (n < FORMATOS[form.formato].minEquipos) return `Selecciona al menos ${FORMATOS[form.formato].minEquipos} equipos.`;
  if (form.formato === 'eliminacion') {
    const byes = nextPow2(n) - n;
    return `${rondasDe(n)} ronda${rondasDe(n) > 1 ? 's' : ''}, ${n - 1} partidos${byes ? ` y ${byes} pase${byes > 1 ? 's' : ''} directo${byes > 1 ? 's' : ''} (bye)` : ''}.`;
  }
  if (form.formato === 'liga') return `${jornadas} jornadas y ${partidosLiga} partidos.`;
  const g = Number(form.numGrupos) || 1;
  const min = Math.floor(n / g);
  if (min < 2) return 'Hay demasiados grupos para tantos equipos (mínimo 2 por grupo).';
  const k = Math.min(Number(form.clasificanPorGrupo) || 1, min);
  return `${g} grupo${g > 1 ? 's' : ''} de ${min}${n % g ? `–${min + 1}` : ''} equipos; ${g * k} clasifican a la eliminatoria.`;
}

function describirFormato(c) {
  if (c.tipo === 'temporada') {
    return Number(c.clasificanPorGrupo) > 0 ? `Liga + playoffs (${c.clasificanPorGrupo})` : 'Liga';
  }
  return FORMATOS[c.formato]?.label || c.formato;
}

export default function ListaCompeticiones({ tipo }) {
  const cfg = COMPETICIONES[tipo];
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(inicial);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/torneos?tipo=${tipo}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tipo]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const equiposVisibles = useMemo(() => {
    const todos = data?.catalogos?.equipos || [];
    return form.idDeporte ? todos.filter(e => String(e.idDeporte) === String(form.idDeporte)) : todos;
  }, [data, form.idDeporte]);

  const toggleEquipo = (id) => set('equipos',
    form.equipos.includes(id) ? form.equipos.filter(x => x !== id) : [...form.equipos, id]);

  const todosSeleccionados = equiposVisibles.length > 0 && equiposVisibles.every(e => form.equipos.includes(e.idEquipo));
  const toggleTodos = () => set('equipos', todosSeleccionados ? [] : equiposVisibles.slice(0, MAX_EQUIPOS).map(e => e.idEquipo));

  const abrir = () => { setForm(inicial); setFormError(null); setModal(true); };

  const crear = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.nombre.trim()) return setFormError(`Escribe un nombre para ${cfg.articulo}`);
    if (tipo === 'temporada') {
      if (!form.fechaInicio || !form.fechaFin) return setFormError('Indica la fecha de inicio y la de fin');
      if (form.fechaFin < form.fechaInicio) return setFormError('La fecha de fin no puede ser anterior a la de inicio');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/torneos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tipo }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      router.push(rutaCompeticion(tipo, d.id));
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  };

  const lista = data?.torneos || [];
  const usaPuntos = tipo === 'temporada' || form.formato !== 'eliminacion';

  return (
    <AppShell
      title={cfg.titulo}
      subtitle={`${lista.length} ${cfg.singular}${lista.length === 1 ? '' : 's'}`}
      actions={<button className="btn btn-primary" onClick={abrir}>{cfg.crear}</button>}
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && lista.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">{tipo === 'temporada' ? 'TP' : 'TR'}</div>
            <div className="empty-state-title">{cfg.vacio}</div>
            <div className="empty-state-desc">{cfg.vacioDesc}</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={abrir}>{cfg.crear}</button>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <div className="torneo-grid">
          {lista.map(t => {
            const total = Number(t.totalPartidos);
            const jugados = Number(t.partidosJugados);
            const pct = total ? Math.round((jugados / total) * 100) : 0;
            const fechas = rangoFechas(t.fechaInicio, t.fechaFin);
            return (
              <Link key={t.idTorneo} href={rutaCompeticion(tipo, t.idTorneo)} className="card torneo-card">
                <div className="torneo-card-head">
                  <div className="torneo-card-title">{t.nombre}</div>
                  <div className="torneo-card-meta">
                    {[t.NombreDeporte, fechas].filter(Boolean).join(' · ') || 'Sin fecha'}
                  </div>
                </div>
                <div className="torneo-card-body">
                  <div className="flex gap-8 flex-wrap">
                    <span className={`badge ${tipo === 'temporada' ? 'badge-blue' : formatoBadge[t.formato] || 'badge-gray'}`}>
                      {describirFormato(t)}
                    </span>
                    <span className={`badge ${t.estado === 'Finalizado' ? 'badge-green' : 'badge-yellow'}`}>{t.estado}</span>
                    <span className="badge badge-gray">{t.totalEquipos} equipos</span>
                  </div>
                  <div>
                    <div className="flex-between" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>Progreso</span><span>{jugados}/{total} partidos</span>
                    </div>
                    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {t.campeon && (
                    <div className="champion">
                      <span className="champion-trophy" aria-hidden="true">1º</span>
                      <span>Campeón: {t.campeon}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {modal && data && (
        <Modal title={tipo === 'temporada' ? 'Crear temporada' : 'Crear torneo'} onClose={() => setModal(false)}>
          <form onSubmit={crear}>
            <div className="modal-body">
              {formError && <div className="alert alert-error mb-16" role="alert">{formError}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="cNombre">Nombre</label>
                <input id="cNombre" className="form-input" placeholder={cfg.placeholder} autoFocus
                  value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>

              {tipo === 'torneo' && (
                <div className="form-group">
                  <span className="form-label" id="formato-label">Formato</span>
                  <div className="format-options" role="radiogroup" aria-labelledby="formato-label">
                    {Object.entries(FORMATOS).map(([key, f]) => (
                      <button key={key} type="button" role="radio" aria-checked={form.formato === key}
                        className={`format-option${form.formato === key ? ' selected' : ''}`}
                        onClick={() => set('formato', key)}>
                        <div className="format-option-title">{f.label}</div>
                        <div className="format-option-desc">{f.descripcion}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="cInicio">Fecha de inicio{tipo === 'temporada' ? ' *' : ''}</label>
                  <input id="cInicio" type="date" className="form-input" value={form.fechaInicio}
                    onChange={e => set('fechaInicio', e.target.value)} />
                </div>
                {tipo === 'temporada' ? (
                  <div className="form-group">
                    <label className="form-label" htmlFor="cFin">Fecha de fin *</label>
                    <input id="cFin" type="date" className="form-input" min={form.fechaInicio || undefined}
                      value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" htmlFor="cDeporte">Deporte</label>
                    <select id="cDeporte" className="form-select" value={form.idDeporte}
                      onChange={e => setForm(f => ({ ...f, idDeporte: e.target.value, equipos: [] }))}>
                      <option value="">Todos</option>
                      {data.catalogos.deportes.map(d => <option key={d.idDeporte} value={d.idDeporte}>{d.NombreDeporte}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {tipo === 'temporada' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cDeporteT">Deporte</label>
                    <select id="cDeporteT" className="form-select" value={form.idDeporte}
                      onChange={e => setForm(f => ({ ...f, idDeporte: e.target.value, equipos: [] }))}>
                      <option value="">Todos</option>
                      {data.catalogos.deportes.map(d => <option key={d.idDeporte} value={d.idDeporte}>{d.NombreDeporte}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cPlayoffs">Playoffs</label>
                    <select id="cPlayoffs" className="form-select" value={form.playoffs}
                      onChange={e => set('playoffs', e.target.value)}>
                      {OPCIONES_PLAYOFFS.map(n => (
                        <option key={n} value={n}>{n === 0 ? 'Sin playoffs (gana el líder)' : `Los ${n} mejores`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {usaPuntos && (
                <>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="pV">Pts. victoria</label>
                      <input id="pV" type="number" className="form-input" value={form.puntosVictoria}
                        onChange={e => set('puntosVictoria', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pE">Pts. empate</label>
                      <input id="pE" type="number" className="form-input" value={form.puntosEmpate}
                        onChange={e => set('puntosEmpate', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pD">Pts. derrota</label>
                      <input id="pD" type="number" className="form-input" value={form.puntosDerrota}
                        onChange={e => set('puntosDerrota', e.target.value)} />
                    </div>
                  </div>
                  <label className="flex-center gap-8 mb-16" style={{ fontSize: 14 }}>
                    <input type="checkbox" checked={form.idaVuelta} onChange={e => set('idaVuelta', e.target.checked)} />
                    Partidos de ida y vuelta
                  </label>
                </>
              )}

              {tipo === 'torneo' && form.formato === 'grupos' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="gN">Número de grupos</label>
                    <input id="gN" type="number" min="1" className="form-input" value={form.numGrupos}
                      onChange={e => set('numGrupos', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="gK">Clasifican por grupo</label>
                    <input id="gK" type="number" min="1" className="form-input" value={form.clasificanPorGrupo}
                      onChange={e => set('clasificanPorGrupo', e.target.value)} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <div className="flex-between">
                  <span className="form-label">Equipos participantes ({form.equipos.length})</span>
                  {equiposVisibles.length > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={toggleTodos}>
                      {todosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
                    </button>
                  )}
                </div>
                {equiposVisibles.length === 0 ? (
                  <div className="alert alert-info">
                    No tienes equipos{form.idDeporte ? ' de este deporte' : ''}. <Link href="/equipos" style={{ fontWeight: 700 }}>Crea equipos</Link> primero.
                  </div>
                ) : (
                  <div className="team-picker">
                    {equiposVisibles.map(e => {
                      const orden = form.equipos.indexOf(e.idEquipo);
                      return (
                        <label key={e.idEquipo}>
                          <input type="checkbox" checked={orden >= 0} onChange={() => toggleEquipo(e.idEquipo)} />
                          <span>{e.NombreEquipo}</span>
                          <span className="team-meta">
                            {orden >= 0 && !form.sorteo ? `Semilla ${orden + 1}` : [e.NombreCategoria, e.NombreRama].filter(Boolean).join(' · ')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="form-hint">
                  El orden en que marcas los equipos define la siembra (el primero es la semilla 1).
                </div>
              </div>

              <label className="flex-center gap-8 mb-16" style={{ fontSize: 14 }}>
                <input type="checkbox" checked={form.sorteo} onChange={e => set('sorteo', e.target.checked)} />
                Sortear el orden de los equipos al azar
              </label>

              <div className="alert alert-info">
                <div>
                  {resumen(tipo, form)}
                  {tipo === 'temporada' && form.fechaInicio && form.fechaFin && (
                    <div style={{ marginTop: 4 }}>El calendario se repartirá entre el {rangoFechas(form.fechaInicio, form.fechaFin)}.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creando…' : tipo === 'temporada' ? 'Crear temporada' : 'Crear torneo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
