import { useState } from 'react';
import { C } from '../../constants/colors';

export function Cabecera({ t, update }) {
  const [edit, setEdit] = useState(false);
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {edit ? (
        <input autoFocus defaultValue={t.name} className="num"
          onBlur={(e) => { update({ name: e.target.value.trim() || t.name }, true); setEdit(false); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.red}`, color: C.chalk, borderRadius: 8, padding: '4px 8px', fontSize: 24, fontWeight: 800, outline: 'none' }} />
      ) : (
        <div className="num" onClick={() => setEdit(true)} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, cursor: 'pointer' }}>{t.name}</div>
      )}
      <div style={{ marginLeft: 'auto', fontSize: 10, color: C.dim, letterSpacing: '.14em', whiteSpace: 'nowrap' }}>EDICIÓN {t.edicion}</div>
    </div>
  );
}
