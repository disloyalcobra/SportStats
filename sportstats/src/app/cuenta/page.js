'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { CORREO_SOPORTE } from '@/lib/contacto';

const vacio = { actual: '', nueva: '', confirmar: '' };

export default function CuentaPage() {
  const [usuario, setUsuario] = useState(null);
  const [form, setForm] = useState(vacio);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.usuario) setUsuario(d.usuario); }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const cambiar = async (e) => {
    e.preventDefault();
    setMensaje(null);
    if (form.nueva.length < 6) return setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres' });
    if (form.nueva !== form.confirmar) return setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden' });
    setGuardando(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: form.actual, nueva: form.nueva }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setForm(vacio);
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppShell title="Mi cuenta" subtitle={usuario?.email || ''}>
      <div style={{ maxWidth: 520 }}>
        <div className="card mb-24">
          <div className="card-header"><div className="card-title">Datos de la cuenta</div></div>
          <div className="card-body">
            <div className="form-group">
              <span className="form-label">Nombre</span>
              <div>{usuario?.nombre || '…'}</div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Correo</span>
              <div style={{ wordBreak: 'break-all' }}>{usuario?.email || '…'}</div>
            </div>
          </div>
        </div>

        <form className="card" onSubmit={cambiar}>
          <div className="card-header"><div className="card-title">Cambiar contraseña</div></div>
          <div className="card-body">
            {mensaje && (
              <div className={`alert ${mensaje.tipo === 'ok' ? 'alert-success' : 'alert-error'} mb-16`} role="alert">
                {mensaje.texto}
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="pActual">Contraseña actual</label>
              <input id="pActual" type="password" className="form-input" autoComplete="current-password" required
                value={form.actual} onChange={set('actual')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pNueva">Nueva contraseña</label>
              <input id="pNueva" type="password" className="form-input" autoComplete="new-password" required minLength={6}
                value={form.nueva} onChange={set('nueva')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pConfirmar">Confirmar nueva contraseña</label>
              <input id="pConfirmar" type="password" className="form-input" autoComplete="new-password" required minLength={6}
                value={form.confirmar} onChange={set('confirmar')} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
            <p className="form-hint" style={{ marginTop: 12 }}>
              Si recibiste una contraseña temporal por correo, cámbiala aquí. ¿Problemas con tu cuenta? Escribe a{' '}
              <a href={`mailto:${CORREO_SOPORTE}`} style={{ color: 'var(--primary-mid)', fontWeight: 600 }}>{CORREO_SOPORTE}</a>.
            </p>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
