import { useState } from 'react';
import { C } from '../../constants/colors';
import { uid, hoy, nombreLibre } from '../../utils/database';
import { Btn } from '../../components/Btn';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Cabecera } from './Cabecera';
import { Stepper } from './Stepper';
import { Inscripcion } from './Inscripcion';
import { Orden } from './Orden';
import { Clasificacion } from './Clasificacion';
import { Cuadro } from './Cuadro';
import { Ronda } from './Ronda';
import { FinalFase } from './FinalFase';
import { Resumen } from './Resumen';
import { Detalle } from './Detalle';

export function TorneoTab({ db, commit, active }) {
  const [ver, setVer] = useState(null);
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';

  const nuevo = () => {
    const t = {
      id: uid(), seasonId: db.season.id,
      edicion: db.tournaments.length + 1,
      name: nombreLibre(db.tournaments.map((x) => x.name)),
      date: hoy(), stage: 'inscripcion',
      entrants: [], groups: null, clas: {}, qualified: [],
      qf: null, sf: null, final: null,
    };
    commit({ ...db, tournaments: [...db.tournaments, t], activeId: t.id }, true);
  };

  const update = (patch, now = false) =>
    commit({ ...db, tournaments: db.tournaments.map((t) => (t.id === active.id ? { ...t, ...patch } : t)) }, now);

  if (ver) {
    const t = db.tournaments.find((x) => x.id === ver.id);
    if (t) return (
      <Detalle t={t} db={db} name={name} modo={ver.modo}
        setModo={(m) => setVer({ ...ver, modo: m })} onBack={() => setVer(null)} />
    );
  }

  if (!active) {
    const hist = [...db.tournaments].reverse();
    return (
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <Eyebrow>Sin torneo en curso · {db.season.nombre}</Eyebrow>
        <Btn tone="red" full onClick={nuevo}>Crear torneo</Btn>
        {hist.length > 0 && (
          <>
            <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
            <Eyebrow>Historial</Eyebrow>
            <div style={{ fontSize: 10.5, color: C.dim, marginTop: -8 }}>
              Toca un torneo para ver su registro, su cuadro y compartirlo.
            </div>
            {hist.map((t) => (
              <Card key={t.id} onClick={() => setVer({ id: t.id, modo: 'registro' })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="num" style={{ fontWeight: 800, fontSize: 19 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                    Edición {t.edicion} · {t.date} · {t.entrants.length} jugadores
                  </div>
                </div>
                {t.final?.winner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Avatar id={t.final.winner} name={name(t.final.winner)} size={34} ring={C.gold} />
                    <div>
                      <Eyebrow color={C.gold}>Campeón</Eyebrow>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{name(t.final.winner)}</div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Cabecera t={active} update={update} />
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
        <Btn small disabled={!active.qf} onClick={() => setVer({ id: active.id, modo: 'cuadro' })}>Cuadro</Btn>
        <Btn small onClick={() => setVer({ id: active.id, modo: 'registro' })}>Registro</Btn>
      </div>
      <Stepper stage={active.stage} />
      {active.stage === 'inscripcion' && <Inscripcion db={db} commit={commit} t={active} update={update} />}
      {active.stage === 'orden' && <Orden t={active} name={name} update={update} />}
      {active.stage === 'clasificacion' && <Clasificacion t={active} name={name} update={update} />}
      {active.stage === 'cuadro' && <Cuadro t={active} name={name} update={update} />}
      {active.stage === 'cuartos' && <Ronda t={active} name={name} update={update} fase="qf" />}
      {active.stage === 'semis' && <Ronda t={active} name={name} update={update} fase="sf" />}
      {active.stage === 'final' && <FinalFase t={active} name={name} update={update} />}
      {active.stage === 'resumen' && <Resumen t={active} name={name} db={db} commit={commit} setVer={setVer} />}
    </div>
  );
}
