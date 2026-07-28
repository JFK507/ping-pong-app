import { C } from '../constants/colors';

export const Segmento = ({ ops, val, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ops.length},1fr)`, gap: 5 }}>
    {ops.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)}
        style={{
          background: val === k ? C.redInk : 'transparent', border: `1px solid ${val === k ? C.red : C.line}`,
          color: val === k ? C.chalk : C.dim, borderRadius: 10, padding: '9px 4px',
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}>{l}</button>
    ))}
  </div>
);
