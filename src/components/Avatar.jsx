import { C } from '../constants/colors';
import { useFotos } from '../context/FotoContext';

const iniciales = (n = '') => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const Avatar = ({ id, name, size = 28, ring }) => {
  const { fotos } = useFotos();
  const src = fotos[id];
  const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `1px solid ${ring || C.line}`, objectFit: 'cover' };
  if (src) return <img src={src} alt="" style={base} />;
  return (
    <div style={{ ...base, background: C.card2, display: 'grid', placeItems: 'center', fontSize: Math.max(9, size * 0.36), fontWeight: 700, color: C.dim }}>
      {iniciales(name) || '?'}
    </div>
  );
};
