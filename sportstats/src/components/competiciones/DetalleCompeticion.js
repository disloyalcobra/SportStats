'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Bracket from '@/components/torneos/Bracket';
import Jornadas from '@/components/torneos/Jornadas';
import TablaPosiciones from '@/components/torneos/TablaPosiciones';
import ResultadoModal from '@/components/torneos/ResultadoModal';
import { FORMATOS } from '@/lib/torneos';
import { COMPETICIONES, rangoFechas } from './config';

export default function DetalleCompeticion({ tipo: tipoRuta }) {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [tab, setTab] = useState('regular');

  useEffect(() => {
    fetch(`/api/torneos/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) return setError(d.error);
        setData(d);
        if (d.torneo.formato === 'grupos' && d.partidos.some(p => p.fase === 'eliminatoria')) setTab('final');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const t = data?.torneo;
  const tipo = t?.tipo || tipoRuta;
  const cfg = COMPETICIONES[tipo];
  const esTemporada = tipo === 'temporada';

  const nombres = new Map((data?.equipos || []).map(e => [e.idEquipo, e.NombreEquipo]));
  const semillas = new Map((data?.equipos || []).map(e => [e.idEquipo, e.semilla]));
  const nombre = (idEquipo) => (idEquipo == null ? 'Por definir' : nombres.get(idEquipo) || 'Equipo eliminado');

  const guardarResultado = async (payload) => {
    const res = await fetch(`/api/torneos/${id}/partidos/${seleccionado.idTorneoPartido}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    setData(d);
    setSeleccionado(null);
  };

  const generarFaseFinal = async () => {
    setAviso(null);
    const res = await fetch(`/api/torneos/${id}/eliminatoria`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) return setAviso(d.error);
    setData(d);
    setTab('final');
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar ${cfg.articulo}? También se eliminarán sus partidos, alineaciones y estadísticas.`)) return;
    const res = await fetch(`/api/torneos/${id}`, { method: 'DELETE' });
    if (res.ok) router.push(cfg.base);
  };

  const partidos = data?.partidos || [];
  const eliminatoria = partidos.filter(p => p.fase === 'eliminatoria');
  const deGrupo = partidos.filter(p => p.fase === 'grupo');
  const jugables = partidos.filter(p => !p.esBye);
  const jugados = jugables.filter(p => p.marcadorLocal !== null && p.marcadorVisitante !== null).length;
  const pendientesGrupo = deGrupo.filter(p => p.marcadorLocal === null || p.marcadorVisitante === null).length;
  const letras = Object.keys(data?.tablas || {});

  const etiquetas = esTemporada
    ? { regular: 'Temporada regular', final: 'Playoffs', generar: 'Generar playoffs', cuadro: 'Playoffs' }
    : { regular: 'Fase de grupos', final: 'Eliminatoria', generar: 'Generar eliminatoria', cuadro: 'Cuadro final' };

  const subtitulo = t
    ? [
      esTemporada ? (t.formato === 'grupos' ? `Liga + playoffs (${t.clasificanPorGrupo})` : 'Liga') : FORMATOS[t.formato]?.label,
      `${data.equipos.length} equipos`,
      `${jugados}/${jugables.length} partidos jugados`,
    ].join(' · ')
    : '';

  return (
    <AppShell
      title={t?.nombre || cfg.titulo}
      subtitle={subtitulo}
      actions={
        <>
          <Link href={cfg.base} className="btn btn-ghost">← {cfg.titulo}</Link>
          {t && <button className="btn btn-danger" onClick={eliminar}>Eliminar</button>}
        </>
      }
    >
      {loading && !data && <div className="loading"><div className="spinner" /> Cargando…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {t && (
        <>
          <div className="flex gap-8 flex-wrap mb-16">
            <span className={`badge ${t.estado === 'Finalizado' ? 'badge-green' : 'badge-yellow'}`}>{t.estado}</span>
            {t.NombreDeporte && <span className="badge badge-gray">{t.NombreDeporte}</span>}
            {(t.fechaInicio || t.fechaFin) && <span className="badge badge-gray">{rangoFechas(t.fechaInicio, t.fechaFin)}</span>}
            {t.formato !== 'eliminacion' && (
              <span className="badge badge-blue">
                Victoria {t.puntosVictoria} · Empate {t.puntosEmpate} · Derrota {t.puntosDerrota}
                {t.idaVuelta ? ' · Ida y vuelta' : ''}
              </span>
            )}
          </div>

          {t.idCampeon && (
            <div className="champion champion-lg mb-24">
              <span className="champion-trophy" aria-hidden="true">1º</span>
              <span>Campeón: {nombre(t.idCampeon)}</span>
            </div>
          )}

          {aviso && <div className="alert alert-error mb-16" role="alert">{aviso}</div>}

          {/* ---------- Eliminación directa ---------- */}
          {t.formato === 'eliminacion' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Cuadro de eliminación</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Haz clic en un enfrentamiento para capturar el resultado</span>
              </div>
              <div className="card-body">
                <Bracket partidos={eliminatoria} nombre={nombre} semilla={(i) => semillas.get(i)}
                  onSelect={setSeleccionado} idCampeon={t.idCampeon} />
              </div>
            </div>
          )}

          {/* ---------- Liga (torneo o temporada sin playoffs) ---------- */}
          {t.formato === 'liga' && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header"><div className="card-title">Tabla de posiciones</div></div>
                <div className="card-body">
                  <TablaPosiciones filas={data.tablas.General || []} nombre={nombre} clasifican={1} />
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Jornadas</div></div>
                <div className="card-body">
                  <Jornadas partidos={partidos} nombre={nombre} onSelect={setSeleccionado} />
                </div>
              </div>
            </div>
          )}

          {/* ---------- Fase regular/grupos + fase final ---------- */}
          {t.formato === 'grupos' && (
            <>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'regular'} className={`tab-btn${tab === 'regular' ? ' active' : ''}`}
                  onClick={() => setTab('regular')}>{etiquetas.regular}</button>
                <button role="tab" aria-selected={tab === 'final'} className={`tab-btn${tab === 'final' ? ' active' : ''}`}
                  onClick={() => setTab('final')}>{etiquetas.final}</button>
              </div>

              {tab === 'regular' && (
                <>
                  <div className="form-hint mb-16">
                    <span className="legend-dot" />
                    {esTemporada
                      ? `Los ${t.clasificanPorGrupo} primeros de la tabla jugarán los playoffs.`
                      : `Clasifican los ${t.clasificanPorGrupo} primeros de cada grupo.`}
                  </div>
                  <div className={letras.length > 1 ? 'grid-2' : ''}>
                    {letras.map(g => (
                      <div key={g} className="card">
                        <div className="card-header">
                          <div className="card-title">{esTemporada ? 'Tabla general' : `Grupo ${g}`}</div>
                        </div>
                        <div className="card-body">
                          <div className={esTemporada ? 'grid-2' : ''}>
                            <div>
                              <TablaPosiciones filas={data.tablas[g]} nombre={nombre} clasifican={t.clasificanPorGrupo} />
                            </div>
                            <div style={{ marginTop: esTemporada ? 0 : 16 }}>
                              <Jornadas partidos={deGrupo.filter(p => p.grupo === g)} nombre={nombre}
                                onSelect={setSeleccionado} editable={eliminatoria.length === 0} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === 'final' && (
                eliminatoria.length > 0 ? (
                  <div className="card">
                    <div className="card-header"><div className="card-title">{etiquetas.cuadro}</div></div>
                    <div className="card-body">
                      <Bracket partidos={eliminatoria} nombre={nombre} onSelect={setSeleccionado} idCampeon={t.idCampeon} />
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">{esTemporada ? 'PO' : 'EL'}</div>
                      <div className="empty-state-title">
                        {esTemporada ? 'Los playoffs aún no se generan' : 'La eliminatoria aún no se genera'}
                      </div>
                      <div className="empty-state-desc">
                        {pendientesGrupo === 0
                          ? `Todos los partidos de ${esTemporada ? 'la temporada regular' : 'grupo'} tienen resultado. Ya puedes armar el cuadro.`
                          : `Faltan ${pendientesGrupo} resultados de ${esTemporada ? 'la temporada regular' : 'la fase de grupos'}.`}
                      </div>
                      <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={pendientesGrupo > 0}
                        onClick={generarFaseFinal}>
                        {etiquetas.generar}
                      </button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </>
      )}

      {seleccionado && (
        <ResultadoModal
          partido={seleccionado}
          nombre={nombre}
          permiteEmpate={seleccionado.fase !== 'eliminatoria'}
          onClose={() => setSeleccionado(null)}
          onSave={guardarResultado}
        />
      )}
    </AppShell>
  );
}
