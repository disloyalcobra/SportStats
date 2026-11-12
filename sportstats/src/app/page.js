'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const estadoBadge = (estado) => {
  const map = {
    'Culminado': 'badge-green',
    'Proximo': 'badge-blue',
    'Pospuesto': 'badge-yellow',
    'Anulado': 'badge-red',
  };
  return map[estado] || 'badge-gray';
};

const tipoBadge = (tipo) => {
  const map = {
    'Temporada': 'badge-blue',
    'Torneo': 'badge-purple',
    'Amistoso': 'badge-gray',
    'Eliminatoria': 'badge-red',
  };
  return map[tipo] || 'badge-gray';
};

function formatFecha(f) {
  if (!f) return '-';
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Build chart data from grafica
  const chartData = (() => {
    if (!data?.grafica?.length) return null;
    const equipos = [...new Set(data.grafica.map(r => r.NombreEquipo))];
    const fechas = [...new Set(data.grafica.map(r => r.fecha))].sort();

    const colors = ['#2563EB', '#DC2626', '#7C3AED', '#059669'];
    const datasets = equipos.map((eq, i) => ({
      label: eq,
      data: fechas.map(f => {
        const row = data.grafica.find(r => r.NombreEquipo === eq && r.fecha === f);
        return row ? row.PTS : null;
      }),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '22',
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true,
    }));

    return {
      labels: fechas.map(f => formatFecha(f)),
      datasets,
    };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Inter', size: 12 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        ticks: { font: { family: 'Inter' } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter' } },
      },
    },
  };

  return (
    <AppShell title="Dashboard" subtitle="Resumen general del torneo">
      {loading && <div className="loading"><div className="spinner" /> Cargando estadísticas...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon blue">EQ</div>
              <div>
                <div className="kpi-value">{String(data.kpis.totalEquipos)}</div>
                <div className="kpi-label">Equipos registrados</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon green">JG</div>
              <div>
                <div className="kpi-value">{String(data.kpis.totalJugadores)}</div>
                <div className="kpi-label">Jugadores activos</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon purple">PT</div>
              <div>
                <div className="kpi-value">{String(data.kpis.totalPartidos)}</div>
                <div className="kpi-label">Partidos jugados</div>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon red">PR</div>
              <div>
                <div className="kpi-value">{String(data.proximos?.length ?? 0)}</div>
                <div className="kpi-label">Partidos próximos</div>
              </div>
            </div>
            <Link href="/temporadas" className="kpi-card">
              <div className="kpi-icon blue">TP</div>
              <div>
                <div className="kpi-value">{String(data.kpis.torneosActivos ?? 0)}</div>
                <div className="kpi-label">Temporadas y torneos en curso</div>
              </div>
            </Link>
          </div>

          <div className="grid-2 mb-24">
            {/* Gráfica de rendimiento */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Puntos por Partido</div>
              </div>
              <div className="card-body">
                {chartData ? (
                  <div style={{ height: 250 }}>
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <div className="empty-state-desc">Sin datos de rendimiento</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla de posiciones */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Tabla de Posiciones</div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Equipo</th>
                      <th>PJ</th>
                      <th>G</th>
                      <th>P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.posiciones || []).map((eq, i) => (
                      <tr key={eq.idEquipo}>
                        <td>
                          <span style={{
                            fontWeight: 800,
                            color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : 'var(--text-muted)',
                          }}>
                            {i + 1}
                          </span>
                        </td>
                        <td>
                          <div className="flex-center gap-8">
                            <div className="avatar">{eq.NombreEquipo?.[0]}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{eq.NombreEquipo}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{eq.NombreCategoria} · {eq.NombreRama}</div>
                            </div>
                          </div>
                        </td>
                        <td>{Number(eq.partidos)}</td>
                        <td><span style={{ color: '#15803D', fontWeight: 700 }}>{Number(eq.ganados)}</span></td>
                        <td><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{Number(eq.perdidos)}</span></td>
                      </tr>
                    ))}
                    {(!data.posiciones || data.posiciones.length === 0) && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Sin equipos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Partidos Recientes */}
          <div className="card mb-24">
            <div className="card-header">
              <div className="card-title">Partidos Recientes</div>
              <Link href="/partidos">
                <button className="btn btn-ghost btn-sm">Ver todos →</button>
              </Link>
            </div>
            <div className="card-body">
              {data.recientes?.length > 0 ? (
                <div className="grid-2" style={{ gap: 12 }}>
                  {data.recientes.map(p => (
                    <Link key={p.idPartido} href={`/partidos/${p.idPartido}`} style={{ display: 'block' }}>
                      <div className="score-card">
                        <div className="score-team">
                          <div className="score-team-name">{p.nombreLocal || 'Local'}</div>
                          <div className="score-pts">{p.ptsLocal ?? '—'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="score-vs">VS</div>
                          <div style={{ fontSize: 10, opacity: .5, marginTop: 4 }}>{formatFecha(p.fecha)}</div>
                          <div style={{ fontSize: 10, opacity: .4, marginTop: 2 }}>{p.TipoPartido}</div>
                        </div>
                        <div className="score-team">
                          <div className="score-team-name">{p.nombreVisitante || 'Visitante'}</div>
                          <div className="score-pts">{p.ptsVisitante ?? '—'}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-desc">No hay partidos culminados aún</div>
                </div>
              )}
            </div>
          </div>

          {/* Próximos Partidos */}
          {data.proximos?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Próximos Partidos</div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.proximos.map(p => (
                      <tr key={p.idPartido}>
                        <td>{formatFecha(p.fecha)}</td>
                        <td>{p.horaInicio}</td>
                        <td><span className={`badge ${tipoBadge(p.TipoPartido)}`}>{p.TipoPartido}</span></td>
                        <td>{p.ubicacion || '—'}</td>
                        <td>
                          <Link href={`/partidos/${p.idPartido}`}>
                            <button className="btn btn-primary btn-sm">Ver</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
