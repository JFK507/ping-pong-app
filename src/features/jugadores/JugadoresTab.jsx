import { useState } from 'react';
import { C } from '../../constants/colors';
import { uid } from '../../utils/database';
import { agregados } from '../../utils/stats';
import { Btn } from '../../components/Btn';
import { Card } from '../../components/Card';
import { Avatar } from '../../components/Avatar';
import { Perfil } from './Perfil';

export function JugadoresTab({ db, commit }) {
  const [val, setVal] = useState('');
  const [sel, setSel] = useState(null);

  const add = () => {
    const n = val.trim();
    if (!n || db.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) { setVal(''); return; }
    commit({ ...db, players: [...db.players, { id: uid(), name: n, apodo: '', mano: '', notas: '' }] }, true);
    setVal('');
  };

  if (sel) {
    const p = db.players.find((x) => x.id === sel);
    if (p) return <Perfil p={p} db={db} commit={commit} onBack={() => setSel(null)} />;
  }

  const stats = agregados(db);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Agregar jugador"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '13px 14px', fontSize: 15, outline: 'none' }} />
        <Btn tone="red" onClick={add}>+</Btn>
      </div>

      {db.players.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>Aún no hay jugadores registrados.</div>}

      <div style={{ display: 'grid', gap: 5 }}>
        {[...db.players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const s = stats[p.id];
          const asis = s && totalT ? Math.round((s.tor / totalT) * 100) : 0;
          return (
            <Card key={p.id} onClick={() => setSel(p.id)} style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <Avatar id={p.id} name={p.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {p.name}{p.apodo && <span style={{ color: C.dim, fontWeight: 400 }}> · {p.apodo}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>
                  {s ? `${s.tor} de ${totalT} ediciones · ${asis}% · ${s.pts} pts${s.tit ? ` · ★${s.tit}` : ''}` : 'Sin torneos jugados'}
                </div>
              </div>
              <span style={{ color: C.dim, fontSize: 16 }}>›</span>
            </Card>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.dim }}>Toca a un jugador para su ficha, foto, notas y estadísticas.</div>
    </div>
  );
}
