'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TIPOS_PARTIDO = {
  temporada: 'Temporada regular',
  playoffs: 'Playoffs',
  torneo: 'Torneo',
  amistoso: 'Amistoso',
};

const TABS = [
  { key: 'puntos', label: 'Líderes de Puntos' },
  { key: 'rebotes', label: 'Líderes de Rebotes' },
  { key: 'asistencias', label: 'Líderes de Asistencias' },
  { key: 'eficiencia', label: 'Eficiencia (EFF/PIR)' },
  { key: 'equipos', label: 'Por Equipo' },
];

export default function ReportesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('puntos');
  const [idTorneo, setIdTorneo] = useState('');
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams();
    if (idTorneo) qs.set('idTorneo', idTorneo);
    if (tipo) qs.set('tipo', tipo);
    fetch(`/api/reportes?${qs}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [idTorneo, tipo]);

  const competiciones = data?.competiciones || [];
  const temporadas = competiciones.filter(c => c.tipo === 'temporada');
  const torneos = competiciones.filter(c => c.tipo !== 'temporada');

  const [exportando, setExportando] = useState(false);
  const exportarPdf = async () => {
    setExportando(true);
    try {
      const { generarReportePdf } = await import('@/lib/reportePdf');
      const comp = competiciones.find(c => String(c.idTorneo) === String(idTorneo));
      await generarReportePdf(data, {
        competicion: comp ? `${comp.nombre} (${comp.tipo === 'temporada' ? 'temporada' : 'torneo'})` : 'Todas',
        competicionArchivo: comp ? comp.nombre : 'general',
        tipo: TIPOS_PARTIDO[tipo] || 'Todos',
      });
    } catch (e) {
      alert(`No se pudo generar el PDF: ${e.message}`);
    } finally {
      setExportando(false);
    }
  };

  const getChartData = () => {
    if (!data) return null;
    const configs = {
      puntos: { rows: data.puntos, valueKey: 'promPuntos', label: 'Prom. Puntos', nameKey: 'ApellidoPJugador', color: '#2563EB' },
      rebotes: { rows: data.rebotes, valueKey: 'promRebotes', label: 'Prom. Rebotes', nameKey: 'ApellidoPJugador', color: '#7C3AED' },
      asistencias: { rows: data.asistencias, valueKey: 'promAsistencias', label: 'Prom. Asistencias', nameKey: 'ApellidoPJugador', color: '#059669' },
      eficiencia: { rows: data.eficiencia, valueKey: 'promEFF', label: 'EFF promedio', nameKey: 'ApellidoPJugador', color: '#DC2626' },
      equipos: { rows: data.equipos, valueKey: 'promPTS', label: 'Prom. Puntos', nameKey: 'NombreEquipo', color: '#1B3A6B' },
    };

    const cfg = configs[tab];
    if (!cfg?.rows?.length) return null;
    const labels = cfg.rows.map(r => r[cfg.nameKey]);
    return {
      labels,
      datasets: [{
        label: cfg.label,
        data: cfg.rows.map(r => Number(r[cfg.valueKey]) || 0),
        backgroundColor: cfg.color + 'CC',
        borderColor: cfg.color,
        borderWidth: 2,
        borderRadius: 6,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.raw}` } },
    },
    scales: {
      x: { grid: { color: '#F1F5F9' }, ticks: { font: { family: 'Inter', size: 12 } } },
      y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 }, color: '#334155' } },
    },
  };

  const chartData = getChartData();

  const renderRankBadge = (i) => {
    const colors = ['#F59E0B', '#94A3B8', '#B45309'];
    const labels = ['1°', '2°', '3°'];
    return (
      <span style={{ fontWeight: 800, color: colors[i] ?? 'var(--text-muted)' }}>
        {labels[i] ?? i + 1}
      </span>
    );
  };

  const renderPlayerTable = (rows, valueKey, valueLabel, extra) => (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Equipo</th>
          <th>PJ</th>
          <th>{valueLabel}</th>
          {extra?.map(e => <th key={e.key}>{e.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows?.map((r, i) => (
          <tr key={r.idJugador}>
            <td>{renderRankBadge(i)}</td>
            <td>
              <div className="flex-center gap-8">
                <div className="avatar">{r.NombreJugador?.[0]}{r.ApellidoPJugador?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.NombreJugador} {r.ApellidoPJugador}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{r.NumeroJugador}</div>
                </div>
              </div>
            </td>
            <td>{r.NombreEquipo}</td>
            <td>{String(Number(r.partidos) || 0)}</td>
            <td style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>
              {(Number(r[valueKey]) || 0).toFixed(1)}
            </td>
            {extra?.map(e => (
              <td key={e.key} style={{ fontWeight: 600 }}>
                {(Number(r[e.key]) || 0).toFixed(1)}
              </td>
            ))}
          </tr>
        ))}
        {(!rows || rows.length === 0) && (
          <tr>
            <td colSpan={10}>
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-desc">Sin estadísticas disponibles aún</div>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <AppShell
      title="Reportes y Estadísticas"
      subtitle="Líderes y estadísticas por competición y tipo de partido"
      actions={
        <button className="btn btn-primary" onClick={exportarPdf} disabled={!data || exportando}
          title="Descarga un PDF con los filtros actuales">
          {exportando ? 'Generando PDF…' : 'Exportar PDF'}
        </button>
      }
    >
      {loading && <div className="loading"><div className="spinner" /> Cargando reportes...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          {/* Filtros */}
          <div className="card mb-24">
            <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="flex-center gap-12 flex-wrap">
                <label className="flex-center gap-8" style={{ fontSize: 13, fontWeight: 600 }}>
                  Competición
                  <select className="form-select" style={{ width: 240 }} value={idTorneo} onChange={e => setIdTorneo(e.target.value)}>
                    <option value="">Todas</option>
                    {temporadas.length > 0 && (
                      <optgroup label="Temporadas">
                        {temporadas.map(c => <option key={c.idTorneo} value={c.idTorneo}>{c.nombre}</option>)}
                      </optgroup>
                    )}
                    {torneos.length > 0 && (
                      <optgroup label="Torneos">
                        {torneos.map(c => <option key={c.idTorneo} value={c.idTorneo}>{c.nombre}</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
                <label className="flex-center gap-8" style={{ fontSize: 13, fontWeight: 600 }}>
                  Tipo de partido
                  <select className="form-select" style={{ width: 180 }} value={tipo} onChange={e => setTipo(e.target.value)}>
                    <option value="">Todos</option>
                    {Object.entries(TIPOS_PARTIDO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                {(idTorneo || tipo) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setIdTorneo(''); setTipo(''); }}>Limpiar</button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid-2">
            {/* Gráfica */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Gráfica</div>
              </div>
              <div className="card-body">
                {chartData ? (
                  <div style={{ height: 350 }}>
                    <Bar data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="empty-state" style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="empty-state-desc">Sin datos disponibles</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Ranking</div>
              </div>
              <div className="table-wrapper">
                {tab === 'puntos' && renderPlayerTable(data.puntos, 'promPuntos', 'Prom. PTS', [{ key: 'totalPuntos', label: 'Total' }])}
                {tab === 'rebotes' && renderPlayerTable(data.rebotes, 'promRebotes', 'Prom. REB', [{ key: 'totalRebotes', label: 'Total' }])}
                {tab === 'asistencias' && renderPlayerTable(data.asistencias, 'promAsistencias', 'Prom. AST', [{ key: 'totalAsistencias', label: 'Total' }])}
                {tab === 'eficiencia' && renderPlayerTable(data.eficiencia, 'promEFF', 'EFF', [{ key: 'promPIR', label: 'PIR' }])}
                {tab === 'equipos' && (
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Equipo</th><th>PJ</th>
                        <th>Prom. PTS</th><th>Prom. REB</th><th>FG%</th><th>3P%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.equipos?.map((eq, i) => (
                        <tr key={eq.NombreEquipo}>
                          <td style={{ fontWeight: 800 }}>{renderRankBadge(i)}</td>
                          <td>
                            <div className="flex-center gap-8">
                              <div className="avatar">{eq.NombreEquipo?.[0]}</div>
                              <strong>{eq.NombreEquipo}</strong>
                            </div>
                          </td>
                          <td>{String(Number(eq.partidos) || 0)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 16 }}>
                            {(Number(eq.promPTS) || 0).toFixed(1)}
                          </td>
                          <td>{(Number(eq.promReb) || 0).toFixed(1)}</td>
                          <td>{(Number(eq.promFG) || 0).toFixed(1)}%</td>
                          <td>{(Number(eq.prom3P) || 0).toFixed(1)}%</td>
                        </tr>
                      ))}
                      {(!data.equipos || data.equipos.length === 0) && (
                        <tr><td colSpan={7}>
                          <div className="empty-state" style={{ padding: '24px 0' }}>
                            <div className="empty-state-desc">Sin estadísticas de equipo aún</div>
                          </div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
