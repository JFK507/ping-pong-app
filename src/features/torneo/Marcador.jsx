import { useEffect, useRef } from 'react';
import { C } from '../../constants/colors';
import { vibra } from '../../utils/helpers';
import { usePantallaViva } from '../../hooks/usePantallaViva';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';

export function Marcador({ titulo, idA, idB, nameA, nameB, a, b, target, adv, onPoint, winner, winnerId, onConfirm, onBack, extra }) {
  usePantallaViva(true);
  const prev = useRef(null);
  useEffect(() => {
    if (winner && prev.current !== winner) vibra([30, 60, 30, 60, 110]);
    prev.current = winner;
  }, [winner]);

  const tocar = (side, d) => { if (d > 0) vibra(12); onPoint(side, d); };

  const Side = ({ id, n, v, side, lead }) => (
    <div onClick={() => tocar(side, 1)}
      style={{
        background: lead ? C.goldInk : C.card, border: `1px solid ${lead ? C.gold : C.line}`,
        borderRadius: 14, padding: '14px 10px 12px', textAlign: 'center', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 205, justifyContent: 'center',
      }}>
      <Avatar id={id} name={n} size={44} ring={lead ? C.gold : C.line} />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: lead ? C.gold : C.chalk, wordBreak: 'break-word' }}>{n}</div>
      <div className="num" style={{ fontSize: 60, fontWeight: 800, lineHeight: .9, color: lead ? C.gold : C.chalk }}>{v}</div>
      <button onClick={(e) => { e.stopPropagation(); tocar(side, -1); }}
        style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.dim, borderRadius: 8, padding: '5px 16px', fontSize: 13, cursor: 'pointer' }}>−1</button>
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && <Btn small onClick={onBack}>←</Btn>}
        <Eyebrow color={C.red}>{titulo}</Eyebrow>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.dim }}>a {target}{adv ? ' · ventaja 2' : ' · seco'}</div>
      </div>

      {extra}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Side id={idA} n={nameA} v={a} side="a" lead={a > b} />
        <Side id={idB} n={nameB} v={b} side="b" lead={b > a} />
      </div>

      {winner ? (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <Eyebrow color={C.chalk}>Ganador</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '8px 0 12px' }}>
            <Avatar id={winnerId} name={winner} size={38} ring={C.gold} />
            <div className="num" style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{winner}</div>
          </div>
          <Btn tone="gold" full onClick={onConfirm}>Guardar resultado</Btn>
        </Card>
      ) : (
        <div style={{ fontSize: 11, color: C.dim, textAlign: 'center' }}>Toca el lado del jugador que anota.</div>
      )}
    </div>
  );
}
