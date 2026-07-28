import { C } from '../../constants/colors';
import { setTarget, setAdv, isWin } from '../../utils/torneo';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Vacio } from '../../components/Vacio';

const Baja = () => (
  <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}>
    <div style={{ width: 1, height: 16, background: C.line }} />
  </div>
);

export function CuadroCompleto({ t, name }) {
  if (!t.qf) return <Vacio>El cuadro aparece cuando se completen los 8 clasificados.</Vacio>;

  const seed = (id) => { const i = t.qualified.indexOf(id); return i >= 0 ? `A${i + 1}` : ''; };

  const Duelo = ({ et, a, b, sa, sb, winner, listo, tone }) => (
    <Card style={{ padding: '9px 11px', borderColor: tone || C.line }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="num" style={{ fontSize: 10, fontWeight: 800, color: tone || C.dim, width: 20 }}>{et}</span>
        <div style={{ flex: 1, display: 'grid', gap: 5 }}>
          {[[a, sa], [b, sb]].map(([id, s], i) => {
            const gana = listo && winner === id;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar id={id} name={name(id)} size={22} ring={gana ? C.gold : C.line} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: gana ? 700 : 400, color: gana ? C.gold : C.chalk, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name(id)}</span>
                {seed(id) && <span className="num" style={{ fontSize: 10, color: C.dim }}>{seed(id)}</span>}
                <span className="num" style={{ fontSize: 15, fontWeight: 800, width: 20, textAlign: 'right', color: gana ? C.gold : C.dim }}>
                  {listo || sa || sb ? s : '·'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );

  const PorJugar = ({ et, texto }) => (
    <Card style={{ padding: '13px 11px', borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="num" style={{ fontSize: 10, fontWeight: 800, color: C.dim, width: 20 }}>{et}</span>
      <span style={{ fontSize: 12, color: C.dim }}>{texto}</span>
    </Card>
  );

  const f = t.final;
  const wa = f ? f.sets.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length : 0;
  const wb = f ? f.sets.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length : 0;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      {[0, 1].map((r) => {
        const m1 = t.qf[r === 0 ? 0 : 1], m2 = t.qf[r === 0 ? 2 : 3];
        const s = t.sf ? t.sf[r] : null;
        return (
          <div key={r} style={{ display: 'grid', gap: 6 }}>
            <Eyebrow color={C.red}>Rama {r + 1}</Eyebrow>
            <Duelo et={`C${m1.n}`} a={m1.a} b={m1.b} sa={m1.sa} sb={m1.sb} winner={m1.winner} listo={m1.locked} />
            <Duelo et={`C${m2.n}`} a={m2.a} b={m2.b} sa={m2.sa} sb={m2.sb} winner={m2.winner} listo={m2.locked} />
            <Baja />
            {s ? <Duelo et={`S${s.n}`} a={s.a} b={s.b} sa={s.sa} sb={s.sb} winner={s.winner} listo={s.locked} tone={C.gold} />
              : <PorJugar et={`S${r + 1}`} texto="Espera a los ganadores de cuartos" />}
          </div>
        );
      })}

      <div style={{ height: 1, background: C.line }} />
      <Eyebrow color={C.gold}>Final</Eyebrow>
      {f ? (
        <Card style={{ borderColor: C.gold, background: f.locked ? C.goldInk : C.card }}>
          {[[f.a, wa], [f.b, wb]].map(([id, w], i) => {
            const gana = f.locked && f.winner === id;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <Avatar id={id} name={name(id)} size={30} ring={gana ? C.gold : C.line} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: gana ? 700 : 400, color: gana ? C.gold : C.chalk }}>{name(id)}</span>
                <span className="num" style={{ fontSize: 22, fontWeight: 800, color: gana ? C.gold : C.dim }}>{w}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 9, letterSpacing: '.16em', color: C.dim, fontWeight: 700 }}>SETS</span>
            {f.sets.map((s, i) => <span key={i} className="num" style={{ fontSize: 13, color: C.dim }}>{s.a}-{s.b}</span>)}
          </div>
        </Card>
      ) : <PorJugar et="F" texto="Espera a los ganadores de semifinales" />}

      {f?.winner && (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <Eyebrow color={C.chalk}>Campeón</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 }}>
            <Avatar id={f.winner} name={name(f.winner)} size={40} ring={C.gold} />
            <div className="num" style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{name(f.winner)}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
