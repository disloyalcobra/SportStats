'use client';
import { useState } from 'react';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import { CORREO_SOPORTE } from '@/lib/contacto';

/**
 * Formulario compartido de inicio de sesión / registro.
 * mode: 'login' | 'registro'
 */
export default function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isLogin && form.password !== form.confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(isLogin ? '/api/auth/login' : '/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin
          ? { email: form.email, password: form.password }
          : { nombre: form.nombre, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la solicitud');

      // Volver a la página solicitada originalmente (solo rutas internas)
      const next = new URLSearchParams(window.location.search).get('next');
      const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      window.location.assign(destino);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="logo-icon">SS</div>
        <div>
          <div className="auth-brand-title">SportStats</div>
          <div className="auth-brand-sub">Estadísticas deportivas</div>
        </div>
      </div>

      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-title">{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Accede a tus equipos, partidos y torneos.'
            : 'Tus datos serán privados: ninguna otra cuenta podrá verlos.'}
        </p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {!isLogin && (
          <div className="form-group">
            <label className="form-label" htmlFor="nombre">Nombre</label>
            <input id="nombre" className="form-input" autoComplete="name" required
              value={form.nombre} onChange={set('nombre')} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo electrónico</label>
          <input id="email" type="email" className="form-input" autoComplete="email" required
            value={form.email} onChange={set('email')} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="form-input" required minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={form.password} onChange={set('password')} />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirmar contraseña</label>
            <input id="confirm" type="password" className="form-input" required minLength={6}
              autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </div>
        )}

        {isLogin && (
          <details className="auth-recover">
            <summary>¿Olvidaste tu contraseña?</summary>
            <p>
              Escribe a{' '}
              <a href={`mailto:${CORREO_SOPORTE}?subject=${encodeURIComponent('Recuperar cuenta SportStats')}&body=${encodeURIComponent('Hola, necesito recuperar el acceso a mi cuenta de SportStats.\n\nCorreo de mi cuenta: \nNombre con el que me registré: ')}`}>
                {CORREO_SOPORTE}
              </a>{' '}
              <strong>desde el mismo correo con el que te registraste</strong>, indicando tu nombre. Te enviaremos una
              contraseña temporal para que vuelvas a entrar.
            </p>
          </details>
        )}

        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
          {loading ? 'Procesando…' : isLogin ? 'Entrar' : 'Crear cuenta'}
        </button>

        <div className="auth-switch">
          {isLogin ? (
            <>¿No tienes cuenta? <Link href="/registro">Crear cuenta</Link></>
          ) : (
            <>¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link></>
          )}
        </div>
      </form>

      <SiteFooter variant="dark" />
    </div>
  );
}
