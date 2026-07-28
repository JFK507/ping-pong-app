import { C } from '../../constants/colors';
import { Btn } from '../../components/Btn';
import { Segmento } from '../../components/Segmento';
import { CuadroCompleto } from './CuadroCompleto';
import { Registro } from './Registro';
import { Compartir } from './Compartir';

export function Detalle({ t, db, name, modo, setModo, onBack }) {
  return (
    <div>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn small onClick={onBack}>←</Btn>
        <div className="num" style={{ fontSize: 23, fontWeight: 800, lineHeight: 1 }}>{t.name}</div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: C.dim, letterSpacing: '.14em', whiteSpace: 'nowrap' }}>EDICIÓN {t.edicion}</div>
      </div>
      <div style={{ padding: '12px 16px 0' }}>
        <Segmento ops={[['cuadro', 'Cuadro'], ['registro', 'Registro'], ['compartir', 'Compartir']]} val={modo} onChange={setModo} />
      </div>
      {modo === 'cuadro' && <CuadroCompleto t={t} name={name} />}
      {modo === 'registro' && <Registro t={t} name={name} />}
      {modo === 'compartir' && <Compartir t={t} db={db} name={name} />}
    </div>
  );
}
