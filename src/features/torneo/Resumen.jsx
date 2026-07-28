import { useMemo } from 'react';
import { C } from '../../constants/colors';
import { calcTorneo, etiquetaPts } from '../../utils/stats';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';

export function Resumen({ t, name, db, commit, setVer }) {
  const { pts, dif } = useMemo(() => calcTorneo(t), [t]);
  const filas = t.entrants.map((id) => ({ id, pts: pts[id] || 0, dif: dif[id] || 0 }))
    .sort((x, y) => y.pts - x.pts || y.dif - x.dif);

  const finalizar = () =>
    commit({
      ...db,
      tournaments: db.tournaments.map((x) => (x.id === t.id ? { ...x, stage: 'finalizado', result: { pts, dif } } : x)),
      activeId: null,
    }, true);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
        <Eyebrow color={C.chalk}>Campeón {t.name}</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <Avatar id={t.final?.winner} name={t.final?.winner ? name(t.final.winner) : ''} size={52} ring={C.gold} />
          <div className="num" style={{ fontSize: 30, fontWeight: 800, color: C.gold }}>
            {t.final?.winner ? name(t.final.winner) : '—'}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', fontSize: 10, letterSpacing: '.14em', color: C.dim, padding: '0 12px', fontWeight: 700 }}>
        <span style={{ flex: 1 }}>JUGADOR</span>
        <span style={{ width: 44, textAlign: 'right' }}>PTS</span>
        <span style={{ width: 44, textAlign: 'right' }}>DIF</span>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        {filas.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: `1px solid ${r.pts >= 25 ? C.gold : C.line}`, borderRadius: 9, padding: '8px 12px' }}>
            <span className="num" style={{ width: 18, fontSize: 12, color: C.dim }}>{i + 1}</span>
            <Avatar id={r.id} name={name(r.id)} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{name(r.id)}</div>
              <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: '.08em', textTransform: 'uppercase' }}>{etiquetaPts(r.pts)}</div>
            </div>
            <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 16, fontWeight: 800, color: r.pts ? C.gold : C.dim }}>{r.pts}</span>
            <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 14, color: C.dim }}>{r.dif > 0 ? '+' : ''}{r.dif}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        La diferencia cuenta lo anotado menos lo recibido de cuartos en adelante.
      </div>
      <Btn onClick={() => setVer({ id: t.id, modo: 'compartir' })}>Compartir resumen</Btn>
      <Btn tone="red" full onClick={finalizar}>Finalizar torneo y sumar al ranking</Btn>
    </div>
  );
}
