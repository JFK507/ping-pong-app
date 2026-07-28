import { useMemo } from 'react';
import { C } from '../../constants/colors';
import { setTarget, setAdv, isWin } from '../../utils/torneo';
import { calcTorneo, etiquetaPts, ordenRanking } from '../../utils/stats';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Pips } from '../../components/Pips';
import { ColOrden } from '../../components/ColOrden';

export function Registro({ t, name }) {
  const { pts, dif } = useMemo(() => calcTorneo(t), [t]);
  const noClas = t.entrants.filter((id) => !t.qualified.includes(id));
  const tabla = t.entrants.map((id) => ({ id, pts: pts[id] || 0, dif: dif[id] || 0 })).sort(ordenRanking);

  const Sec = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <Eyebrow color={C.red}>{children}</Eyebrow>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );

  const Linea = ({ et, a, b, sa, sb, w }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 9 }}>
      <span className="num" style={{ fontSize: 10, color: C.dim, fontWeight: 800, width: 18 }}>{et}</span>
      <span style={{ flex: 1, fontSize: 12.5, textAlign: 'right', fontWeight: w === a ? 700 : 400, color: w === a ? C.gold : C.chalk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(a)}</span>
      <span className="num" style={{ fontSize: 15, fontWeight: 800, minWidth: 42, textAlign: 'center' }}>{sa}<span style={{ color: C.dim, margin: '0 2px' }}>-</span>{sb}</span>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: w === b ? 700 : 400, color: w === b ? C.gold : C.chalk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(b)}</span>
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 11.5, color: C.dim }}>
        {t.date} · {t.entrants.length} inscritos · {t.stage === 'finalizado' ? 'finalizado' : 'en curso'}
      </div>

      {t.groups && (
        <>
          <Sec>Lados de la mesa</Sec>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 10 }}>
            <ColOrden titulo="Izquierda" ids={t.groups.izq} name={name} />
            <div style={{ background: C.line }} />
            <ColOrden titulo="Derecha" ids={t.groups.der} name={name} />
          </div>
        </>
      )}

      {t.qualified.length > 0 && (
        <>
          <Sec>Orden de clasificación</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.qualified.map((id, i) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 9 }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 800, color: C.gold, width: 22 }}>A{i + 1}</span>
                <Avatar id={id} name={name(id)} size={24} />
                <span style={{ flex: 1, fontSize: 13 }}>{name(id)}</span>
                <span className="num" style={{ fontSize: 13, color: C.dim }}>7 pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      {noClas.length > 0 && (
        <>
          <Sec>No clasificaron</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {noClas.slice().sort((a, b) => (t.clas[b] || 0) - (t.clas[a] || 0)).map((id) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                <Avatar id={id} name={name(id)} size={22} />
                <span style={{ flex: 1, fontSize: 12.5, color: C.dim }}>{name(id)}</span>
                <Pips n={t.clas[id] || 0} on={C.red} />
                <span className="num" style={{ fontSize: 12, color: C.dim, width: 34, textAlign: 'right' }}>{t.clas[id] || 0} pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      {t.qf && (
        <>
          <Sec>Cuartos de final</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.qf.map((m) => <Linea key={m.n} et={`C${m.n}`} a={m.a} b={m.b} sa={m.sa} sb={m.sb} w={m.locked ? m.winner : null} />)}
          </div>
        </>
      )}

      {t.sf && (
        <>
          <Sec>Semifinales</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.sf.map((m) => <Linea key={m.n} et={`S${m.n}`} a={m.a} b={m.b} sa={m.sa} sb={m.sb} w={m.locked ? m.winner : null} />)}
          </div>
        </>
      )}

      {t.final && (
        <>
          <Sec>Final</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.final.sets.map((s, i) => (
              <Linea key={i} et={`${i + 1}º`} a={t.final.a} b={t.final.b} sa={s.a} sb={s.b}
                w={isWin(s.a, s.b, setTarget(i), setAdv(i)) ? t.final.a : isWin(s.b, s.a, setTarget(i), setAdv(i)) ? t.final.b : null} />
            ))}
          </div>
        </>
      )}

      <Sec>Puntos del torneo</Sec>
      <div style={{ display: 'grid', gap: 4 }}>
        {tabla.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.card, border: `1px solid ${r.pts >= 25 ? C.gold : C.line}`, borderRadius: 9 }}>
            <span className="num" style={{ width: 16, fontSize: 11, color: C.dim }}>{i + 1}</span>
            <Avatar id={r.id} name={name(r.id)} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5 }}>{name(r.id)}</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: '.08em', textTransform: 'uppercase' }}>{etiquetaPts(r.pts)}</div>
            </div>
            <span className="num" style={{ fontSize: 12, color: C.dim, width: 34, textAlign: 'right' }}>{r.dif > 0 ? '+' : ''}{r.dif}</span>
            <span className="num" style={{ fontSize: 17, fontWeight: 800, color: r.pts ? C.gold : C.dim, width: 30, textAlign: 'right' }}>{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
