'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'DB', section: 'Principal' },
  { href: '/partidos', label: 'Partidos', icon: 'PT', section: 'Gestión' },
  { href: '/equipos', label: 'Equipos', icon: 'EQ', section: 'Gestión' },
  { href: '/jugadores', label: 'Jugadores', icon: 'JG', section: 'Gestión' },
  { href: '/entrenadores', label: 'Entrenadores', icon: 'EN', section: 'Gestión' },
  { href: '/reportes', label: 'Reportes', icon: 'RP', section: 'Análisis' },
];

const sections = ['Principal', 'Gestión', 'Análisis'];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SS</div>
        <div>
          <div className="logo-text">SportStats</div>
          <div className="logo-sub">Basketball · UMAD</div>
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
                  <Link key={item.href} href={item.href}>
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

      <div className="sidebar-footer">
        SportStats v1.0 · 2026
      </div>
    </aside>
  );
}
