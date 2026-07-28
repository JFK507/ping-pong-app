import { useState } from 'react';
import { C } from '../../constants/colors';
import { TARGET_QF, TARGET_SF } from '../../constants/config';
import { isWin } from '../../utils/torneo';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';
import { Marcador } from './Marcador';

const Fila = ({ id, nombre, score, win }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <Avatar id={id} name={nombre} size={24} ring={win ? C.gold : C.line} />
    <span style={{ flex: 1, fontSize: 13.5, fontWeight: win ? 700 : 400, color: win ? C.gold : C.chalk }}>{nombre}</span>
    <span className="num" style={{ fontSize: 17, fontWeight: 800, color: win ? C.gold : C.dim }}>{score}</span>
  </div>
);

export function Ronda({ t, name, update, fase }) {
  const target = fase === 'qf' ? TARGET_QF : TARGET_SF;
  const list = t[fase] || [];
  const [open, setOpen] = useState(null);
  const titulo = fase === 'qf' ? 'Cuartos de final' : 'Semifinales';
  const pref = fase === 'qf' ? 'C' : 'S';

  const setMatch = (i, patch, now = false) =>
    update({ [fase]: list.map((m, j) => (j === i ? { ...m, ...patch } : m)) }, now);

  const todos = list.length > 0 && list.every((m) => m.locked);

  const avanzar = () => {
    const w = list.map((m) => m.winner);
    if (fase === 'qf') {
      update({
        sf: [
          { n: 1, a: w[0], b: w[2], sa: 0, sb: 0, winner: null, locked: false },
          { n: 2, a: w[1], b: w[3], sa: 0, sb: 0, winner: null, locked: false },
        ], stage: 'semis',
      }, true);
    } else {
      update({ final: { a: w[0], b: w[1], sets: [{ a: 0, b: 0 }], winner: null, locked: false }, stage: 'final' }, true);
    }
  };

  if (open !== null) {
    const m = list[open];
    return (
      <Marcador
        titulo={`${titulo} · ${pref}${m.n}`}
        idA={m.a} idB={m.b} nameA={name(m.a)} nameB={name(m.b)}
        a={m.sa} b={m.sb} target={target} adv={false}
        onPoint={(side, d) => {
          const cerrado = isWin(m.sa, m.sb, target, false) || isWin(m.sb, m.sa, target, false);
          if (cerrado && d > 0) return;
          const na = side === 'a' ? Math.max(0, m.sa + d) : m.sa;
          const nb = side === 'b' ? Math.max(0, m.sb + d) : m.sb;
          setMatch(open, { sa: na, sb: nb, winner: isWin(na, nb, target, false) ? m.a : isWin(nb, na, target, false) ? m.b : null });
        }}
        winnerId={m.winner} winner={m.winner ? name(m.winner) : null}
        onConfirm={() => { setMatch(open, { locked: true }, true); setOpen(null); }}
        onBack={() => setOpen(null)}
      />
    );
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 11, color: C.dim }}>A {target} puntos, sin ventaja.</div>
      {list.map((m, i) => (
        <Card key={i} onClick={() => setOpen(i)} style={{ cursor: 'pointer', borderColor: m.locked ? C.line : C.red }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: m.locked ? C.dim : C.red, fontWeight: 800, width: 20 }}>{pref}{m.n}</span>
            <div style={{ flex: 1, display: 'grid', gap: 4 }}>
              <Fila id={m.a} nombre={name(m.a)} score={m.sa} win={m.locked && m.winner === m.a} />
              <Fila id={m.b} nombre={name(m.b)} score={m.sb} win={m.locked && m.winner === m.b} />
            </div>
            {!m.locked && <span style={{ fontSize: 10, color: C.red, letterSpacing: '.14em', fontWeight: 700 }}>JUGAR</span>}
          </div>
        </Card>
      ))}
      {todos && <Btn tone="gold" full onClick={avanzar}>{fase === 'qf' ? 'Ir a semifinales' : 'Ir a la final'}</Btn>}
    </div>
  );
}
