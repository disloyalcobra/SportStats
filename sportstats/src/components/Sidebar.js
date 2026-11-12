'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'DB', section: 'Principal' },
  { href: '/partidos', label: 'Partidos', icon: 'PT', section: 'Gestión' },
  { href: '/temporadas', label: 'Temporadas', icon: 'TP', section: 'Gestión' },
  { href: '/torneos', label: 'Torneos', icon: 'TR', section: 'Gestión' },
  { href: '/equipos', label: 'Equipos', icon: 'EQ', section: 'Gestión' },
  { href: '/jugadores', label: 'Jugadores', icon: 'JG', section: 'Gestión' },
  { href: '/entrenadores', label: 'Entrenadores', icon: 'EN', section: 'Gestión' },
  { href: '/reportes', label: 'Reportes', icon: 'RP', section: 'Análisis' },
  { href: '/cuenta', label: 'Mi cuenta', icon: 'MC', section: 'Cuenta' },
];

const sections = ['Principal', 'Gestión', 'Análisis', 'Cuenta'];

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.assign('/login');
  }
}

export default function Sidebar({ open = false, onNavigate }) {
  const pathname = usePathname();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then(async r => {
        // Cookie presente pero sesión inválida/expirada: limpiar y volver al login
        if (r.status === 401) return logout();
        const d = await r.json();
        if (!cancelled && d.usuario) setUsuario(d.usuario);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <button type="button" className="sidebar-close" onClick={onNavigate} aria-label="Cerrar menú">✕</button>
        <div className="logo-icon">SS</div>
        <div>
          <div className="logo-text">SportStats</div>
          <div className="logo-sub">Estadísticas deportivas</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => {
          const items = navItems.filter(i => i.section === section);
          return (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {items.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate}>
                    <div className={`nav-item ${isActive ? 'active' : ''}`}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar" aria-hidden="true">
          {(usuario?.nombre || '?').trim().charAt(0).toUpperCase()}
        </div>
        <Link href="/cuenta" className="sidebar-user-info" onClick={onNavigate} title="Mi cuenta · cambiar contraseña">
          <div className="sidebar-user-name">{usuario?.nombre || '…'}</div>
          <div className="sidebar-user-email">{usuario?.email || ''}</div>
        </Link>
        <button className="sidebar-logout" onClick={logout} title="Cerrar sesión">
          Salir
        </button>
      </div>

      <div className="sidebar-footer">
        SportStats v1.1 · 2026
      </div>
    </aside>
  );
}
