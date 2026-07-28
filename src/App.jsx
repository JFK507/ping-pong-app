import { useCallback, useEffect, useRef, useState } from 'react';

import { C } from './constants/colors';
import { FotoProvider } from './context/FotoContext';
import { load, save } from './utils/storage';

import { TorneoTab } from './features/torneo/TorneoTab';
import { RankingTab } from './features/ranking/RankingTab';
import { JugadoresTab } from './features/jugadores/JugadoresTab';
import { DatosTab } from './features/datos/DatosTab';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
  :root { --disp:'Barlow Condensed','Arial Narrow',Impact,sans-serif; --ui:'Inter',system-ui,-apple-system,sans-serif; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  input,select,textarea { font-family:var(--ui); }
  .num { font-family:var(--disp); font-variant-numeric:tabular-nums; }
  ::-webkit-scrollbar { width:0; height:0; }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; animation:none !important; } }
  @keyframes rise { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;

export default function App() {
  const [db, setDb] = useState(null);
  const [tab, setTab] = useState('torneo');
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const pend = useRef(null);

  useEffect(() => {
    (async () => setDb(await load()))();
  }, []);

  const flush = useCallback(async () => {
    if (!pend.current) return;
    const payload = pend.current;
    pend.current = null;
    try { await save(payload); setSaved(true); } catch { setSaved(false); }
  }, []);

  const commit = useCallback((next, now = false) => {
    setDb(next); pend.current = next; setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    if (now) flush(); else timer.current = setTimeout(flush, 700);
  }, [flush]);

  useEffect(() => {
    const h = () => flush();
    document.addEventListener('visibilitychange', h);
    window.addEventListener('pagehide', h);
    return () => { document.removeEventListener('visibilitychange', h); window.removeEventListener('pagehide', h); };
  }, [flush]);

  if (!db) {
    return (
      <div style={{ background: C.ink, color: C.dim, minHeight: 520, display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
        <style>{css}</style>Cargando…
      </div>
    );
  }

  const active = db.tournaments.find((t) => t.id === db.activeId) || null;

  return (
    <FotoProvider>
      <div style={{ background: C.ink, color: C.chalk, minHeight: 640, fontFamily: 'var(--ui)', display: 'flex', flexDirection: 'column' }}>
        <style>{css}</style>

        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>GRAND SLAM</div>
          <div style={{ fontSize: 9, letterSpacing: '.28em', color: C.red, fontWeight: 700, textTransform: 'uppercase' }}>Ping Pong Series</div>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: saved ? C.line : C.gold }}>{saved ? '●' : '○'}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {tab === 'torneo' && <TorneoTab db={db} commit={commit} active={active} />}
          {tab === 'ranking' && <RankingTab db={db} commit={commit} />}
          {tab === 'jugadores' && <JugadoresTab db={db} commit={commit} />}
          {tab === 'datos' && <DatosTab db={db} commit={commit} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: `1px solid ${C.line}`, background: C.slate }}>
          {[['torneo', 'Torneo'], ['ranking', 'Ranking'], ['jugadores', 'Jugadores'], ['datos', 'Datos']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                background: 'transparent', border: 0, padding: '13px 4px 15px', cursor: 'pointer',
                color: tab === k ? C.chalk : C.dim, borderTop: `2px solid ${tab === k ? C.red : 'transparent'}`,
                fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
              }}>{l}</button>
          ))}
        </div>
      </div>
    </FotoProvider>
  );
}
