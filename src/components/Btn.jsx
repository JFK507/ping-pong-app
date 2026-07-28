import { C } from '../constants/colors';

export function Btn({ children, onClick, tone = 'ghost', disabled, full, small, style }) {
  const tones = {
    red: { bg: C.red, fg: '#fff', bd: C.red },
    gold: { bg: C.gold, fg: '#191400', bd: C.gold },
    ghost: { bg: 'transparent', fg: C.chalk, bd: C.line },
  };
  const t = tones[tone] || tones.ghost;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? C.card : t.bg, color: disabled ? C.dim : t.fg,
        border: `1px solid ${disabled ? C.line : t.bd}`, borderRadius: 10,
        padding: small ? '8px 12px' : '13px 18px', fontFamily: 'var(--ui)', fontWeight: 700,
        fontSize: small ? 12 : 14, letterSpacing: '.06em', textTransform: 'uppercase',
        width: full ? '100%' : undefined, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform .08s ease', ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
      {children}
    </button>
  );
}
