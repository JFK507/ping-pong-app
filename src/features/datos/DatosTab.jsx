import { useState } from 'react';
import { C } from '../../constants/colors';
import { K_FOTOS } from '../../constants/config';
import { emptyDB, migrar } from '../../utils/database';
import { useFotos } from '../../context/FotoContext';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';

export function DatosTab({ db, commit }) {
  const { fotos } = useFotos();
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');

  const exportar = () => { setTxt(JSON.stringify({ db, fotos })); setMsg('Copia todo el texto y guárdalo donde quieras.'); };

  const importar = async () => {
    try {
      const d = JSON.parse(txt);
      const st = migrar(d.db || d);
      if (!st.players || !st.tournaments) throw new Error('formato');
      if (d.fotos) { try { await window.storage.set(K_FOTOS, JSON.stringify(d.fotos)); } catch { } }
      commit(st, true);
      setMsg('Respaldo restaurado. Cierra y vuelve a abrir para ver las fotos.');
    } catch { setMsg('Ese texto no es un respaldo válido.'); }
  };

  const borrar = () => {
    if (confirm('Se borran jugadores, torneos, fotos, temporadas y ranking. No se puede deshacer.')) {
      commit(emptyDB(), true);
      window.storage.set(K_FOTOS, JSON.stringify({})).catch(() => { });
      setTxt(''); setMsg('Todo borrado. Cierra y vuelve a abrir para refrescar.');
    }
  };

  const kb = Math.round(JSON.stringify(fotos).length / 1024);
  const fin = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Eyebrow>Respaldo</Eyebrow>
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
        Los datos viven solo en este dispositivo. Exporta después de cada torneo y pega el texto en tus notas.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn onClick={exportar}>Exportar</Btn>
        <Btn onClick={importar} disabled={!txt.trim()}>Importar</Btn>
      </div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)}
        placeholder="Aquí aparece el respaldo al exportar. Para restaurar, pega el texto y toca Importar."
        style={{ background: C.card, border: `1px solid ${C.line}`, color: C.dim, borderRadius: 10, padding: 12, fontSize: 11, minHeight: 118, outline: 'none', resize: 'vertical' }} />
      {msg && <div style={{ fontSize: 12, color: C.gold }}>{msg}</div>}

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow>Almacenamiento</Eyebrow>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
        {db.players.length} jugadores · {fin} torneos finalizados · {db.seasons.length} temporadas cerradas<br />
        Temporada en curso: {db.season.nombre} (desde {db.season.inicio})<br />
        Fotos: {kb} KB, recortadas a 256×256.
      </div>

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow color={C.red}>Zona de riesgo</Eyebrow>
      <Btn onClick={borrar} style={{ borderColor: C.red, color: C.red }}>Borrar todos los datos</Btn>

      <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
      <Eyebrow>Reglas cargadas</Eyebrow>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
        Clasificación: primeros 8 en llegar a 7 puntos.<br />
        Cuartos a 7 seco · semis a 10 seco.<br />
        Final: sets a 10 con ventaja de 2; si van 1-1, tercer set a 7 seco.<br />
        Puntos acumulativos: clasificar 3 · ganar cuartos +5 · ganar semis +7 · ganar la final +10 (campeón 25).<br />
        La diferencia cuenta lo anotado menos lo recibido de cuartos en adelante.
      </div>
    </div>
  );
}
