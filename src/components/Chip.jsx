import { C } from '../constants/colors';
import { Avatar } from './Avatar';

export const Chip = ({ children, onClick, tone, id, name }) => (
  <button onClick={onClick}
    style={{
      background: tone === 'on' ? C.redInk : C.card, border: `1px solid ${tone === 'on' ? C.red : C.line}`,
      color: C.chalk, borderRadius: 999, padding: '5px 12px 5px 5px', fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
    <Avatar id={id} name={name} size={22} />
    <span>{children}</span>
  </button>
);
