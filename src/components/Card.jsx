import { C } from '../constants/colors';

export const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, ...style }}>
    {children}
  </div>
);
