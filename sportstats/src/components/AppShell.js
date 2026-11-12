'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import SiteFooter from '@/components/SiteFooter';

export default function AppShell({ children, title, subtitle, actions }) {
  // Menú lateral desplegable en pantallas pequeñas
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuAbierto]);

  return (
    <div className="app-layout">
      <Sidebar open={menuAbierto} onNavigate={() => setMenuAbierto(false)} />
      {menuAbierto && <div className="sidebar-backdrop" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <div className="main-content">
        <header className="page-header">
          <div className="page-header-left">
            <button type="button" className="menu-toggle" onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú" aria-expanded={menuAbierto} aria-controls="sidebar">
              <span /><span /><span />
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="page-title">{title}</div>
              {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>
        <main className="page-body">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
