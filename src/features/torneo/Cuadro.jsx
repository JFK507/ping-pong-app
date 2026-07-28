import { C } from '../../constants/colors';
import { shuffle } from '../../utils/helpers';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Avatar } from '../../components/Avatar';
import { Btn } from '../../components/Btn';

export function Cuadro({ t, name, update }) {
  const qf = t.qf;
  const resortear = () => {
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    update({
      qf: [0, 1, 2, 3].map((i) => ({
        n: i + 1, a: t.qualified[idx[i * 2]], b: t.qualified[idx[i * 2 + 1]],
        seedA: idx[i * 2] + 1, seedB: idx[i * 2 + 1] + 1,
        sa: 0, sb: 0, winner: null, locked: false,
      })),
    }, true);
  };

  const Llave = ({ titulo, ms }) => (
    <div style={{ display: 'grid', gap: 6 }}>
      <Eyebrow color={C.red}>{titulo}</Eyebrow>
      {ms.map((m) => (
        <Card key={m.n} style={{ padding: '10px 12px', animation: 'rise .3s ease both', animationDelay: `${m.n * 60}ms` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: C.red, fontWeight: 800, width: 20 }}>C{m.n}</span>
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              {[[m.a, m.seedA], [m.b, m.seedB]].map(([id, s]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar id={id} name={name(id)} size={24} />
                  <span style={{ fontSize: 13, flex: 1 }}>{name(id)}</span>
                  <span className="num" style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>A{s}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Cuadro sorteado al azar. Los ganadores de C1 y C3 se cruzan en la semifinal 1; los de C2 y C4, en la semifinal 2.
      </div>
      <Llave titulo="Semifinal 1 sale de aquí" ms={[qf[0], qf[2]]} />
      <div style={{ height: 1, background: C.line }} />
      <Llave titulo="Semifinal 2 sale de aquí" ms={[qf[1], qf[3]]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
        <Btn onClick={resortear}>Resortear</Btn>
        <Btn tone="gold" onClick={() => update({ stage: 'cuartos' }, true)}>Empezar cuartos</Btn>
      </div>
    </div>
  );
}
