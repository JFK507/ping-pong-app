import { C } from '../constants/colors';

export const Pips = ({ n, max = 7, on = C.gold }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} style={{ width: 8, height: 4, borderRadius: 1, background: i < n ? on : C.line }} />
    ))}
  </div>
);
