'use client';
import Sidebar from '@/components/Sidebar';
import SiteFooter from '@/components/SiteFooter';

export default function AppShell({ children, title, subtitle, actions }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="page-header">
          <div className="page-header-left">
            <div>
              <div className="page-title">{title}</div>
              {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex gap-8">{actions}</div>}
        </header>
        <main className="page-body">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
