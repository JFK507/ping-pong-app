import { C } from '../constants/colors';
import { Eyebrow } from './Eyebrow';
import { Avatar } from './Avatar';

export const ColOrden = ({ titulo, ids, name }) => (
  <div>
    <Eyebrow>{titulo}</Eyebrow>
    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
      {ids.map((id, i) => (
        <div key={id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span className="num" style={{ fontSize: 12, color: C.dim, width: 12 }}>{i + 1}</span>
          <Avatar id={id} name={name(id)} size={22} />
          <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(id)}</span>
        </div>
      ))}
    </div>
  </div>
);
