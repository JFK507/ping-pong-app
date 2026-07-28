import { C } from '../../constants/colors';
import { setTarget, setAdv, isWin } from '../../utils/torneo';
import { vibra } from '../../utils/helpers';
import { Card } from '../../components/Card';
import { Marcador } from './Marcador';

export function FinalFase({ t, name, update }) {
  const f = t.final, sets = f.sets, idx = sets.length - 1, cur = sets[idx];
  const wa = sets.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length;
  const wb = sets.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length;
  const over = wa >= 2 || wb >= 2;

  const point = (side, d) => {
    if (over && d > 0) return;
    const ns = sets.map((s, i) => (i === idx
      ? { a: side === 'a' ? Math.max(0, s.a + d) : s.a, b: side === 'b' ? Math.max(0, s.b + d) : s.b } : s));
    const tg = setTarget(idx), av = setAdv(idx);
    const cerrado = isWin(ns[idx].a, ns[idx].b, tg, av) || isWin(ns[idx].b, ns[idx].a, tg, av);
    let nw = null;
    if (cerrado) {
      const ca = ns.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length;
      const cb = ns.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length;
      if (ca >= 2) nw = f.a; else if (cb >= 2) nw = f.b; else { ns.push({ a: 0, b: 0 }); vibra([40, 70, 40]); }
    }
    update({ final: { ...f, sets: ns, winner: nw } });
  };

  const marcadorSets = (
    <Card style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, color: wa > wb ? C.gold : C.dim }}>{wa}</div>
      <div style={{ fontSize: 9, letterSpacing: '.2em', color: C.dim }}>SETS</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, color: wb > wa ? C.gold : C.dim }}>{wb}</div>
      <div style={{ marginLeft: 10, display: 'flex', gap: 9 }}>
        {sets.map((s, i) => <div key={i} className="num" style={{ fontSize: 13, color: i === idx && !over ? C.red : C.dim }}>{s.a}-{s.b}</div>)}
      </div>
    </Card>
  );

  return (
    <Marcador
      titulo={`Final · Set ${idx + 1}`}
      idA={f.a} idB={f.b} nameA={name(f.a)} nameB={name(f.b)}
      a={cur.a} b={cur.b} target={setTarget(idx)} adv={setAdv(idx)}
      onPoint={point} winner={f.winner ? name(f.winner) : null} winnerId={f.winner}
      onConfirm={() => update({ final: { ...f, locked: true }, stage: 'resumen' }, true)}
      onBack={null} extra={marcadorSets}
    />
  );
}
