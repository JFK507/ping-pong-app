import { C } from '../../constants/colors';
import { shuffle } from '../../utils/helpers';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';
import { ColOrden } from '../../components/ColOrden';

export function Orden({ t, name, update }) {
  const { izq, der } = t.groups;
  const resortear = () => {
    const s = shuffle([...izq, ...der]);
    const half = Math.ceil(s.length / 2);
    update({ groups: { izq: s.slice(0, half), der: s.slice(half) } }, true);
  };
  const empezar = () => {
    const clas = {};
    [...izq, ...der].forEach((id) => { clas[id] = 0; });
    update({ clas, qualified: [], stage: 'clasificacion' }, true);
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <Card style={{ background: C.redInk, borderColor: C.red }}>
        <Eyebrow color={C.chalk}>Primer partido</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Avatar id={izq[0]} name={name(izq[0])} size={40} />
          <div className="num" style={{ flex: 1, fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
            {name(izq[0])}<span style={{ color: C.gold, margin: '0 8px', fontSize: 13 }}>vs</span>{name(der[0])}
          </div>
          <Avatar id={der[0]} name={name(der[0])} size={40} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12 }}>
        <ColOrden titulo="Izquierda" ids={izq} name={name} />
        <div style={{ background: C.line }} />
        <ColOrden titulo="Derecha" ids={der} name={name} />
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Se juega a un punto. El que pierde sale y entra el siguiente de su lado, en este orden.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn onClick={resortear}>Volver a sortear</Btn>
        <Btn tone="gold" onClick={empezar}>Empezar</Btn>
      </div>
    </div>
  );
}
