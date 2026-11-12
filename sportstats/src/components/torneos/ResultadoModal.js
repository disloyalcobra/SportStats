'use client';
import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';

/** Captura (o borra) el marcador de un enfrentamiento del torneo. */
export default function ResultadoModal({ partido, nombre, permiteEmpate, onClose, onSave }) {
  const [local, setLocal] = useState(partido.marcadorLocal ?? '');
  const [visitante, setVisitante] = useState(partido.marcadorVisitante ?? '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const yaJugado = partido.marcadorLocal !== null && partido.marcadorVisitante !== null;

  const enviar = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(payload);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    if (local === '' || visitante === '') return setError('Captura ambos marcadores');
    if (!permiteEmpate && Number(local) === Number(visitante)) {
      return setError('En eliminatoria no puede haber empate');
    }
    enviar({ marcadorLocal: Number(local), marcadorVisitante: Number(visitante) });
  };

  return (
    <Modal title="Resultado del enfrentamiento" onClose={onClose}>
      <form onSubmit={guardar}>
        <div className="modal-body">
          {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
          <div className="score-inputs">
            <div className="form-group">
              <label className="form-label" htmlFor="mLocal">{nombre(partido.idEquipoLocal)}</label>
              <input id="mLocal" type="number" min="0" inputMode="numeric" className="form-input" autoFocus
                value={local} onChange={e => setLocal(e.target.value)} />
            </div>
            <div className="vs">–</div>
            <div className="form-group">
              <label className="form-label" htmlFor="mVisitante">{nombre(partido.idEquipoVisitante)}</label>
              <input id="mVisitante" type="number" min="0" inputMode="numeric" className="form-input"
                value={visitante} onChange={e => setVisitante(e.target.value)} />
            </div>
          </div>
          <div className="form-hint">
            {permiteEmpate
              ? 'Se permite el empate; la tabla se actualizará automáticamente.'
              : 'El ganador avanzará automáticamente a la siguiente ronda.'}
            {partido.idPartido && ' El marcador también se guarda en el partido y lo marca como culminado.'}
          </div>

          {partido.idPartido && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Partido #{partido.idPartido}{partido.estadoPartido ? ` · ${partido.estadoPartido}` : ''}
                </div>
                <div>
                  ¿Quieres registrar estadísticas por jugador? Captúralas en el partido y márcalo como culminado;
                  el resultado llegará solo al torneo.
                </div>
                <div className="flex gap-8 flex-wrap" style={{ marginTop: 10 }}>
                  <Link href={`/partidos/${partido.idPartido}`} className="btn btn-ghost btn-sm">Ver partido</Link>
                  <Link href={`/partidos/${partido.idPartido}/estadisticas`} className="btn btn-primary btn-sm">Capturar estadísticas</Link>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {yaJugado && (
            <button type="button" className="btn btn-danger" disabled={saving} style={{ marginRight: 'auto' }}
              onClick={() => enviar({ limpiar: true })}>
              Borrar resultado
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
