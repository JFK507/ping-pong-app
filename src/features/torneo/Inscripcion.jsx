import { useState } from 'react';
import { C } from '../../constants/colors';
import { uid } from '../../utils/database';
import { shuffle } from '../../utils/helpers';
import { Btn } from '../../components/Btn';
import { Eyebrow } from '../../components/Eyebrow';
import { Chip } from '../../components/Chip';

export function Inscripcion({ db, commit, t, update }) {
  const [val, setVal] = useState('');

  const addNuevo = () => {
    const n = val.trim();
    if (!n) return;
    const ex = db.players.find((p) => p.name.toLowerCase() === n.toLowerCase());
    let players = db.players, id;
    if (ex) id = ex.id;
    else { id = uid(); players = [...db.players, { id, name: n, apodo: '', mano: '', notas: '' }]; }
    if (t.entrants.includes(id)) { setVal(''); return; }
    commit({ ...db, players, tournaments: db.tournaments.map((x) => (x.id === t.id ? { ...x, entrants: [...x.entrants, id] } : x)) }, true);
    setVal('');
  };

  const toggle = (id) =>
    update({ entrants: t.entrants.includes(id) ? t.entrants.filter((x) => x !== id) : [...t.entrants, id] }, true);

  const sortear = () => {
    const s = shuffle(t.entrants);
    const half = Math.ceil(s.length / 2);
    update({ groups: { izq: s.slice(0, half), der: s.slice(half) }, stage: 'orden' }, true);
  };

  const disp = db.players.filter((p) => !t.entrants.includes(p.id));
  const n = t.entrants.length;
  const nm = (id) => db.players.find((p) => p.id === id)?.name || '?';

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNuevo()}
          placeholder="Nombre del jugador"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '13px 14px', fontSize: 15, outline: 'none' }} />
        <Btn tone="red" onClick={addNuevo}>+</Btn>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <Eyebrow>Inscritos</Eyebrow>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, color: n >= 8 ? C.gold : C.red }}>{n}</div>
          {n < 8 && <div style={{ fontSize: 11, color: C.dim }}>faltan {8 - n} para poder clasificar 8</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {t.entrants.map((id) => (
            <Chip key={id} onClick={() => toggle(id)} tone="on" id={id} name={nm(id)}>
              {nm(id)} <span style={{ opacity: .5, marginLeft: 3 }}>×</span>
            </Chip>
          ))}
          {n === 0 && <div style={{ fontSize: 12, color: C.dim }}>Escribe un nombre y toca + para inscribir.</div>}
        </div>
      </div>

      {disp.length > 0 && (
        <div>
          <Eyebrow>Jugadores del registro</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {disp.map((p) => <Chip key={p.id} onClick={() => toggle(p.id)} id={p.id} name={p.name}>{p.name}</Chip>)}
          </div>
        </div>
      )}

      <Btn tone="gold" full disabled={n < 8} onClick={sortear}>Sortear lados de la mesa</Btn>
    </div>
  );
}
