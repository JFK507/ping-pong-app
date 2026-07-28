import { C } from '../../constants/colors';
import { shuffle, vibra } from '../../utils/helpers';
import { usePantallaViva } from '../../hooks/usePantallaViva';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';
import { Pips } from '../../components/Pips';

export function Clasificacion({ t, name, update }) {
  const { izq, der } = t.groups;
  const clas = t.clas, qual = t.qualified;
  usePantallaViva(true);

  const add = (id, d) => {
    if (qual.includes(id) && d > 0) return;
    const v = Math.max(0, Math.min(7, (clas[id] || 0) + d));
    const nc = { ...clas, [id]: v };
    let nq = [...qual];
    if (v >= 7 && !nq.includes(id) && nq.length < 8) { nq.push(id); vibra([28, 60, 28, 60, 90]); }
    else if (d > 0) vibra(12);
    if (v < 7 && nq.includes(id)) nq = nq.filter((x) => x !== id);
    update({ clas: nc, qualified: nq });
  };

  const listo = qual.length === 8;

  const armarCuadro = () => {
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    update({
      qf: [0, 1, 2, 3].map((i) => ({
        n: i + 1, a: qual[idx[i * 2]], b: qual[idx[i * 2 + 1]],
        seedA: idx[i * 2] + 1, seedB: idx[i * 2 + 1] + 1,
        sa: 0, sb: 0, winner: null, locked: false,
      })), stage: 'cuadro',
    }, true);
  };

  const Col = ({ ids, lado }) => (
    <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
      <Eyebrow>{lado}</Eyebrow>
      {ids.map((id) => {
        const v = clas[id] || 0;
        const seed = qual.indexOf(id);
        const ok = seed >= 0;
        return (
          <div key={id} onClick={() => add(id, 1)}
            style={{ background: ok ? C.goldInk : C.card, border: `1px solid ${ok ? C.gold : C.line}`, borderRadius: 11, padding: '8px 9px', cursor: ok ? 'default' : 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar id={id} name={name(id)} size={24} ring={ok ? C.gold : C.line} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name(id)}</div>
              {ok ? <div className="num" style={{ fontSize: 15, fontWeight: 800, color: C.gold }}>A{seed + 1}</div>
                : <div className="num" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{v}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Pips n={v} on={ok ? C.gold : C.red} />
              {!ok && v > 0 && (
                <button onClick={(e) => { e.stopPropagation(); add(id, -1); }}
                  style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.line}`, color: C.dim, borderRadius: 6, width: 24, height: 20, fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>−</button>
              )}
              {ok && <div style={{ marginLeft: 'auto', fontSize: 8.5, letterSpacing: '.16em', color: C.gold, fontWeight: 700 }}>CLASIFICADO</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="num" style={{ fontSize: 26, fontWeight: 800, color: listo ? C.gold : C.chalk }}>{qual.length}</div>
        <div style={{ fontSize: 12, color: C.dim }}>de 8 clasificados</div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.dim }}>Toca el nombre = +1</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 9 }}>
        <Col ids={izq} lado="Izquierda" />
        <div style={{ background: C.line }} />
        <Col ids={der} lado="Derecha" />
      </div>

      {listo && (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 19, fontWeight: 800, color: C.gold, marginBottom: 10 }}>CLASIFICACIÓN COMPLETADA</div>
          <Btn tone="gold" full onClick={armarCuadro}>Sortear cuartos de final</Btn>
        </Card>
      )}
    </div>
  );
}
