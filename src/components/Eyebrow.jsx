import { C } from '../constants/colors';

export const Eyebrow = ({ children, color = C.dim }) => (
  <div style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color, fontWeight: 700 }}>
    {children}
  </div>
);
