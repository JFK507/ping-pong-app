import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from 'react';
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const val = localStorage.getItem(key);
        return val ? { value: val } : null;
      } catch (e) {
        return null;
      }
    },
    set: async (key, val) => {
      try {
        localStorage.setItem(key, val);
      } catch (e) {
        console.error("Error al guardar en storage", e);
      }
    }
  };
}

const K_STATE = 'gs_state_v2';
const K_FOTOS = 'gs_fotos_v1';
const C = {
  ink: '#0B0B0C', slate: '#141518', card: '#1B1C20', card2: '#232429',
  line: '#2E2F35', chalk: '#F2F0EB', dim: '#82828B',
  red: '#D62828', redInk: '#3B0F0F', gold: '#C9A227', goldInk: '#3A2E0B',
};

const PTS = { clasificar: 3, ganarCuartos: 5, ganarSemis: 7, ganarFinal: 10 };
const TARGET_QF = 7;
const TARGET_SF = 10;

const NOMBRES = [
  'Tomatito', 'Diamante', 'Relámpago', 'Cangrejo', 'Tiburón', 'Volcán', 'Huracán', 'Mango',
  'Guacamayo', 'Pelícano', 'Meteorito', 'Cometa', 'Zafiro', 'Rubí', 'Obsidiana', 'Trueno',
  'Jaguar', 'Colibrí', 'Iguana', 'Pulpo', 'Piraña', 'Ñeque', 'Tucán', 'Marañón',
  'Cacao', 'Papaya', 'Coco', 'Guandú', 'Patacón', 'Chicheme', 'Raspao', 'Carimañola',
  'Hojaldre', 'Tamborito', 'Diablico', 'Pollera', 'Mola', 'Chiva', 'Taboga', 'Azuero',
  'Cerro Punta', 'Bocas', 'Guararé', 'Corotú', 'Macano', 'Guayacán', 'Chichica', 'Sancocho',
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
const hoy = () => new Date().toISOString().slice(0, 10);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const setTarget = (i) => (i === 2 ? 7 : 10);
const setAdv = (i) => i !== 2;
const isWin = (x, y, target, adv) => (adv ? x >= target && x - y >= 2 : x >= target);

const vibra = (p) => { try { navigator.vibrate?.(p); } catch { } };

const STAGES = [
  ['inscripcion', 'Inscripción'], ['orden', 'Orden'], ['clasificacion', 'Clasificación'],
  ['cuadro', 'Cuadro'], ['cuartos', 'Cuartos'], ['semis', 'Semis'], ['final', 'Final'], ['resumen', 'Resumen'],
];

const nombreLibre = (usados) => {
  const libres = NOMBRES.filter((n) => !usados.includes(n));
  const pool = libres.length ? libres : NOMBRES;
  return pool[Math.floor(Math.random() * pool.length)];
};

const nombreTemporada = (db) => {
  const y = new Date().getFullYear();
  const usados = [...(db.seasons || []).map((s) => s.nombre), db.season?.nombre].filter(Boolean);
  let n = `Temporada ${y}`;
  const romanos = ['II', 'III', 'IV', 'V', 'VI'];
  let i = 0;
  while (usados.includes(n) && i < romanos.length) { n = `Temporada ${y} · ${romanos[i]}`; i += 1; }
  return n;
};

const emptyDB = () => ({
  version: 3, players: [], tournaments: [], activeId: null,
  season: { id: uid(), nombre: `Temporada ${new Date().getFullYear()}`, inicio: hoy() },
  seasons: [],
});

function migrar(d) {
  if (!d || !d.players) return emptyDB();
  if (!d.season) {
    const s = { id: uid(), nombre: `Temporada ${new Date().getFullYear()}`, inicio: hoy() };
    d.season = s;
    d.seasons = d.seasons || [];
    d.tournaments = (d.tournaments || []).map((t) => ({ ...t, seasonId: t.seasonId || s.id }));
  }
  d.seasons = d.seasons || [];
  d.tournaments = (d.tournaments || []).map((t) => ({ ...t, seasonId: t.seasonId || d.season.id }));
  return d;
}

/* ─────────── contexto de fotos ─────────── */
const FotoCtx = createContext({ fotos: {}, setFoto: () => { } });

function comprimirFoto(file, lado = 256) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('lectura'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('imagen'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const cv = document.createElement('canvas');
        cv.width = lado; cv.height = lado;
        cv.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, lado, lado);
        res(cv.toDataURL('image/jpeg', 0.72));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ─────────── mantener la pantalla encendida ─────────── */
function usePantallaViva(activo) {
  useEffect(() => {
    if (!activo) return undefined;
    let lock = null, muerto = false;
    const pedir = async () => {
      try { if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen'); } catch { }
    };
    pedir();
    const onVis = () => { if (document.visibilityState === 'visible' && !muerto) pedir(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      muerto = true;
      document.removeEventListener('visibilitychange', onVis);
      try { lock?.release(); } catch { }
    };
  }, [activo]);
}

/* ───────────────────────── UI ───────────────────────── */

const Btn = ({ children, onClick, tone = 'ghost', disabled, full, small, style }) => {
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
};

const Eyebrow = ({ children, color = C.dim }) => (
  <div style={{ fontFamily: 'var(--ui)', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color, fontWeight: 700 }}>
    {children}
  </div>
);

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, ...style }}>
    {children}
  </div>
);

const Pips = ({ n, max = 7, on = C.gold }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} style={{ width: 8, height: 4, borderRadius: 1, background: i < n ? on : C.line }} />
    ))}
  </div>
);

const iniciales = (n = '') => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const Avatar = ({ id, name, size = 28, ring }) => {
  const { fotos } = useContext(FotoCtx);
  const src = fotos[id];
  const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `1px solid ${ring || C.line}`, objectFit: 'cover' };
  if (src) return <img src={src} alt="" style={base} />;
  return (
    <div style={{ ...base, background: C.card2, display: 'grid', placeItems: 'center', fontSize: Math.max(9, size * 0.36), fontWeight: 700, color: C.dim }}>
      {iniciales(name) || '?'}
    </div>
  );
};

const Segmento = ({ ops, val, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ops.length},1fr)`, gap: 5 }}>
    {ops.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)}
        style={{
          background: val === k ? C.redInk : 'transparent', border: `1px solid ${val === k ? C.red : C.line}`,
          color: val === k ? C.chalk : C.dim, borderRadius: 10, padding: '9px 4px',
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}>{l}</button>
    ))}
  </div>
);

/* ───────────────────────── App ───────────────────────── */

export default function App() {
  
  const [db, setDb] = useState(null);
  const [fotos, setFotos] = useState({});
  const [tab, setTab] = useState('torneo');
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const pend = useRef(null);

  useEffect(() => {
    (async () => {
      let d = emptyDB(), f = {};
      try { const r = await window.storage.get(K_STATE); if (r) d = migrar(JSON.parse(r.value)); } catch { }
      try { const r = await window.storage.get(K_FOTOS); if (r) f = JSON.parse(r.value); } catch { }
      setDb(d); setFotos(f);
    })();
  }, []);

  const flush = useCallback(async () => {
    if (!pend.current) return;
    const payload = JSON.stringify(pend.current);
    pend.current = null;
    try { await window.storage.set(K_STATE, payload); setSaved(true); } catch { setSaved(false); }
  }, []);

  const commit = useCallback((next, now = false) => {
    setDb(next); pend.current = next; setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    if (now) flush(); else timer.current = setTimeout(flush, 700);
  }, [flush]);

  const setFoto = useCallback(async (id, dataUrl) => {
    const next = { ...fotos };
    if (dataUrl) next[id] = dataUrl; else delete next[id];
    setFotos(next);
    try { await window.storage.set(K_FOTOS, JSON.stringify(next)); } catch { }
  }, [fotos]);

  
  useEffect(() => {
    const h = () => flush();
    document.addEventListener('visibilitychange', h);
    window.addEventListener('pagehide', h);
    return () => { document.removeEventListener('visibilitychange', h); window.removeEventListener('pagehide', h); };
  }, [flush]);

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

  if (!db) {
    return (
      <div style={{ background: C.ink, color: C.dim, minHeight: 520, display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
        <style>{css}</style>Cargando…
      </div>
    );
  }

  const active = db.tournaments.find((t) => t.id === db.activeId) || null;

  return (
    <FotoCtx.Provider value={{ fotos, setFoto }}>
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
    </FotoCtx.Provider>
  );
}

/* ───────────────────────── Torneo ───────────────────────── */

function TorneoTab({ db, commit, active }) {
  const [ver, setVer] = useState(null);
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';

  const nuevo = () => {
    const t = {
      id: uid(), seasonId: db.season.id,
      edicion: db.tournaments.length + 1,
      name: nombreLibre(db.tournaments.map((x) => x.name)),
      date: hoy(), stage: 'inscripcion',
      entrants: [], groups: null, clas: {}, qualified: [],
      qf: null, sf: null, final: null,
    };
    commit({ ...db, tournaments: [...db.tournaments, t], activeId: t.id }, true);
  };

  const update = (patch, now = false) =>
    commit({ ...db, tournaments: db.tournaments.map((t) => (t.id === active.id ? { ...t, ...patch } : t)) }, now);

  if (ver) {
    const t = db.tournaments.find((x) => x.id === ver.id);
    if (t) return (
      <Detalle t={t} db={db} name={name} modo={ver.modo}
        setModo={(m) => setVer({ ...ver, modo: m })} onBack={() => setVer(null)} />
    );
  }

  if (!active) {
    const hist = [...db.tournaments].reverse();
    return (
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <Eyebrow>Sin torneo en curso · {db.season.nombre}</Eyebrow>
        <Btn tone="red" full onClick={nuevo}>Crear torneo</Btn>
        {hist.length > 0 && (
          <>
            <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
            <Eyebrow>Historial</Eyebrow>
            <div style={{ fontSize: 10.5, color: C.dim, marginTop: -8 }}>
              Toca un torneo para ver su registro, su cuadro y compartirlo.
            </div>
            {hist.map((t) => (
              <Card key={t.id} onClick={() => setVer({ id: t.id, modo: 'registro' })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div className="num" style={{ fontWeight: 800, fontSize: 19 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                    Edición {t.edicion} · {t.date} · {t.entrants.length} jugadores
                  </div>
                </div>
                {t.final?.winner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Avatar id={t.final.winner} name={name(t.final.winner)} size={34} ring={C.gold} />
                    <div>
                      <Eyebrow color={C.gold}>Campeón</Eyebrow>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{name(t.final.winner)}</div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Cabecera t={active} update={update} />
      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
        <Btn small disabled={!active.qf} onClick={() => setVer({ id: active.id, modo: 'cuadro' })}>Cuadro</Btn>
        <Btn small onClick={() => setVer({ id: active.id, modo: 'registro' })}>Registro</Btn>
      </div>
      <Stepper stage={active.stage} />
      {active.stage === 'inscripcion' && <Inscripcion db={db} commit={commit} t={active} update={update} />}
      {active.stage === 'orden' && <Orden t={active} name={name} update={update} />}
      {active.stage === 'clasificacion' && <Clasificacion t={active} name={name} update={update} />}
      {active.stage === 'cuadro' && <Cuadro t={active} name={name} update={update} />}
      {active.stage === 'cuartos' && <Ronda t={active} name={name} update={update} fase="qf" />}
      {active.stage === 'semis' && <Ronda t={active} name={name} update={update} fase="sf" />}
      {active.stage === 'final' && <FinalFase t={active} name={name} update={update} />}
      {active.stage === 'resumen' && <Resumen t={active} name={name} db={db} commit={commit} setVer={setVer} />}
    </div>
  );
}

function Cabecera({ t, update }) {
  const [edit, setEdit] = useState(false);
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      {edit ? (
        <input autoFocus defaultValue={t.name} className="num"
          onBlur={(e) => { update({ name: e.target.value.trim() || t.name }, true); setEdit(false); }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          style={{ flex: 1, background: C.card, border: `1px solid ${C.red}`, color: C.chalk, borderRadius: 8, padding: '4px 8px', fontSize: 24, fontWeight: 800, outline: 'none' }} />
      ) : (
        <div className="num" onClick={() => setEdit(true)} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, cursor: 'pointer' }}>{t.name}</div>
      )}
      <div style={{ marginLeft: 'auto', fontSize: 10, color: C.dim, letterSpacing: '.14em', whiteSpace: 'nowrap' }}>EDICIÓN {t.edicion}</div>
    </div>
  );
}

function Stepper({ stage }) {
  const i = STAGES.findIndex(([k]) => k === stage);
  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
        {STAGES.map(([k], j) => (
          <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: j < i ? C.red : j === i ? C.gold : C.line }} />
        ))}
      </div>
      <Eyebrow color={C.gold}>{STAGES[i]?.[1]}</Eyebrow>
    </div>
  );
}

/* ── Inscripción ── */

function Inscripcion({ db, commit, t, update }) {
  const [val, setVal] = useState('');

  const addNuevo = () => {
    const n = val.trim();
    if (!n) return;
    const ex = db.players.find((p) => p.name.toLowerCase() === n.toLowerCase());
    let players = db.players, id;
    if (ex) id = ex.id;
    else { id = uid(); players = [...db.players, { id, name: n, apodo: '', mano: '', notas: '' }]; }
    if (t.entrants.includes(id)) { setVal(''); return; }
    commit({ ...db, players, tournaments: db.tournaments.map((x) => (x.id === t.id ? { ...x, entrants: [...x.entrants, id] } : x)) }, true);
    setVal('');
  };

  const toggle = (id) =>
    update({ entrants: t.entrants.includes(id) ? t.entrants.filter((x) => x !== id) : [...t.entrants, id] }, true);

  const sortear = () => {
    const s = shuffle(t.entrants);
    const half = Math.ceil(s.length / 2);
    update({ groups: { izq: s.slice(0, half), der: s.slice(half) }, stage: 'orden' }, true);
  };

  const disp = db.players.filter((p) => !t.entrants.includes(p.id));
  const n = t.entrants.length;
  const nm = (id) => db.players.find((p) => p.id === id)?.name || '?';

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNuevo()}
          placeholder="Nombre del jugador"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '13px 14px', fontSize: 15, outline: 'none' }} />
        <Btn tone="red" onClick={addNuevo}>+</Btn>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <Eyebrow>Inscritos</Eyebrow>
          <div className="num" style={{ fontSize: 20, fontWeight: 800, color: n >= 8 ? C.gold : C.red }}>{n}</div>
          {n < 8 && <div style={{ fontSize: 11, color: C.dim }}>faltan {8 - n} para poder clasificar 8</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {t.entrants.map((id) => (
            <Chip key={id} onClick={() => toggle(id)} tone="on" id={id} name={nm(id)}>
              {nm(id)} <span style={{ opacity: .5, marginLeft: 3 }}>×</span>
            </Chip>
          ))}
          {n === 0 && <div style={{ fontSize: 12, color: C.dim }}>Escribe un nombre y toca + para inscribir.</div>}
        </div>
      </div>

      {disp.length > 0 && (
        <div>
          <Eyebrow>Jugadores del registro</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {disp.map((p) => <Chip key={p.id} onClick={() => toggle(p.id)} id={p.id} name={p.name}>{p.name}</Chip>)}
          </div>
        </div>
      )}

      <Btn tone="gold" full disabled={n < 8} onClick={sortear}>Sortear lados de la mesa</Btn>
    </div>
  );
}

const Chip = ({ children, onClick, tone, id, name }) => (
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

/* ── Orden ── */

function Orden({ t, name, update }) {
  const { izq, der } = t.groups;
  const resortear = () => {
    const s = shuffle([...izq, ...der]);
    const half = Math.ceil(s.length / 2);
    update({ groups: { izq: s.slice(0, half), der: s.slice(half) } }, true);
  };
  const empezar = () => {
    const clas = {};
    [...izq, ...der].forEach((id) => { clas[id] = 0; });
    update({ clas, qualified: [], stage: 'clasificacion' }, true);
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <Card style={{ background: C.redInk, borderColor: C.red }}>
        <Eyebrow color={C.chalk}>Primer partido</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Avatar id={izq[0]} name={name(izq[0])} size={40} />
          <div className="num" style={{ flex: 1, fontSize: 17, fontWeight: 700, textAlign: 'center' }}>
            {name(izq[0])}<span style={{ color: C.gold, margin: '0 8px', fontSize: 13 }}>vs</span>{name(der[0])}
          </div>
          <Avatar id={der[0]} name={name(der[0])} size={40} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12 }}>
        <ColOrden titulo="Izquierda" ids={izq} name={name} />
        <div style={{ background: C.line }} />
        <ColOrden titulo="Derecha" ids={der} name={name} />
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Se juega a un punto. El que pierde sale y entra el siguiente de su lado, en este orden.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn onClick={resortear}>Volver a sortear</Btn>
        <Btn tone="gold" onClick={empezar}>Empezar</Btn>
      </div>
    </div>
  );
}

const ColOrden = ({ titulo, ids, name }) => (
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

/* ── Clasificación ── */

function Clasificacion({ t, name, update }) {
  const { izq, der } = t.groups;
  const clas = t.clas, qual = t.qualified;
  usePantallaViva(true);

  const add = (id, d) => {
    if (qual.includes(id) && d > 0) return;
    const v = Math.max(0, Math.min(7, (clas[id] || 0) + d));
    const nc = { ...clas, [id]: v };
    let nq = [...qual];
    if (v >= 7 && !nq.includes(id) && nq.length < 8) { nq.push(id); vibra([28, 60, 28, 60, 90]); }
    else if (d > 0) vibra(12);
    if (v < 7 && nq.includes(id)) nq = nq.filter((x) => x !== id);
    update({ clas: nc, qualified: nq });
  };

  const listo = qual.length === 8;

  const armarCuadro = () => {
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    update({
      qf: [0, 1, 2, 3].map((i) => ({
        n: i + 1, a: qual[idx[i * 2]], b: qual[idx[i * 2 + 1]],
        seedA: idx[i * 2] + 1, seedB: idx[i * 2 + 1] + 1,
        sa: 0, sb: 0, winner: null, locked: false,
      })), stage: 'cuadro',
    }, true);
  };

  const Col = ({ ids, lado }) => (
    <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
      <Eyebrow>{lado}</Eyebrow>
      {ids.map((id) => {
        const v = clas[id] || 0;
        const seed = qual.indexOf(id);
        const ok = seed >= 0;
        return (
          <div key={id} onClick={() => add(id, 1)}
            style={{ background: ok ? C.goldInk : C.card, border: `1px solid ${ok ? C.gold : C.line}`, borderRadius: 11, padding: '8px 9px', cursor: ok ? 'default' : 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar id={id} name={name(id)} size={24} ring={ok ? C.gold : C.line} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name(id)}</div>
              {ok ? <div className="num" style={{ fontSize: 15, fontWeight: 800, color: C.gold }}>A{seed + 1}</div>
                : <div className="num" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{v}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Pips n={v} on={ok ? C.gold : C.red} />
              {!ok && v > 0 && (
                <button onClick={(e) => { e.stopPropagation(); add(id, -1); }}
                  style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.line}`, color: C.dim, borderRadius: 6, width: 24, height: 20, fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>−</button>
              )}
              {ok && <div style={{ marginLeft: 'auto', fontSize: 8.5, letterSpacing: '.16em', color: C.gold, fontWeight: 700 }}>CLASIFICADO</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="num" style={{ fontSize: 26, fontWeight: 800, color: listo ? C.gold : C.chalk }}>{qual.length}</div>
        <div style={{ fontSize: 12, color: C.dim }}>de 8 clasificados</div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.dim }}>Toca el nombre = +1</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 9 }}>
        <Col ids={izq} lado="Izquierda" />
        <div style={{ background: C.line }} />
        <Col ids={der} lado="Derecha" />
      </div>

      {listo && (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <div className="num" style={{ fontSize: 19, fontWeight: 800, color: C.gold, marginBottom: 10 }}>CLASIFICACIÓN COMPLETADA</div>
          <Btn tone="gold" full onClick={armarCuadro}>Sortear cuartos de final</Btn>
        </Card>
      )}
    </div>
  );
}

/* ── Cuadro sorteado ── */

function Cuadro({ t, name, update }) {
  const qf = t.qf;
  const resortear = () => {
    const idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    update({
      qf: [0, 1, 2, 3].map((i) => ({
        n: i + 1, a: t.qualified[idx[i * 2]], b: t.qualified[idx[i * 2 + 1]],
        seedA: idx[i * 2] + 1, seedB: idx[i * 2 + 1] + 1,
        sa: 0, sb: 0, winner: null, locked: false,
      })),
    }, true);
  };

  const Llave = ({ titulo, ms }) => (
    <div style={{ display: 'grid', gap: 6 }}>
      <Eyebrow color={C.red}>{titulo}</Eyebrow>
      {ms.map((m) => (
        <Card key={m.n} style={{ padding: '10px 12px', animation: 'rise .3s ease both', animationDelay: `${m.n * 60}ms` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: C.red, fontWeight: 800, width: 20 }}>C{m.n}</span>
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              {[[m.a, m.seedA], [m.b, m.seedB]].map(([id, s]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Avatar id={id} name={name(id)} size={24} />
                  <span style={{ fontSize: 13, flex: 1 }}>{name(id)}</span>
                  <span className="num" style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>A{s}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        Cuadro sorteado al azar. Los ganadores de C1 y C3 se cruzan en la semifinal 1; los de C2 y C4, en la semifinal 2.
      </div>
      <Llave titulo="Semifinal 1 sale de aquí" ms={[qf[0], qf[2]]} />
      <div style={{ height: 1, background: C.line }} />
      <Llave titulo="Semifinal 2 sale de aquí" ms={[qf[1], qf[3]]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }}>
        <Btn onClick={resortear}>Resortear</Btn>
        <Btn tone="gold" onClick={() => update({ stage: 'cuartos' }, true)}>Empezar cuartos</Btn>
      </div>
    </div>
  );
}

/* ── Rondas ── */

function Ronda({ t, name, update, fase }) {
  const target = fase === 'qf' ? TARGET_QF : TARGET_SF;
  const list = t[fase] || [];
  const [open, setOpen] = useState(null);
  const titulo = fase === 'qf' ? 'Cuartos de final' : 'Semifinales';
  const pref = fase === 'qf' ? 'C' : 'S';

  const setMatch = (i, patch, now = false) =>
    update({ [fase]: list.map((m, j) => (j === i ? { ...m, ...patch } : m)) }, now);

  const todos = list.length > 0 && list.every((m) => m.locked);

  const avanzar = () => {
    const w = list.map((m) => m.winner);
    if (fase === 'qf') {
      update({
        sf: [
          { n: 1, a: w[0], b: w[2], sa: 0, sb: 0, winner: null, locked: false },
          { n: 2, a: w[1], b: w[3], sa: 0, sb: 0, winner: null, locked: false },
        ], stage: 'semis',
      }, true);
    } else {
      update({ final: { a: w[0], b: w[1], sets: [{ a: 0, b: 0 }], winner: null, locked: false }, stage: 'final' }, true);
    }
  };

  if (open !== null) {
    const m = list[open];
    return (
      <Marcador
        titulo={`${titulo} · ${pref}${m.n}`}
        idA={m.a} idB={m.b} nameA={name(m.a)} nameB={name(m.b)}
        a={m.sa} b={m.sb} target={target} adv={false}
        onPoint={(side, d) => {
          const cerrado = isWin(m.sa, m.sb, target, false) || isWin(m.sb, m.sa, target, false);
          if (cerrado && d > 0) return;
          const na = side === 'a' ? Math.max(0, m.sa + d) : m.sa;
          const nb = side === 'b' ? Math.max(0, m.sb + d) : m.sb;
          setMatch(open, { sa: na, sb: nb, winner: isWin(na, nb, target, false) ? m.a : isWin(nb, na, target, false) ? m.b : null });
        }}
        winnerId={m.winner} winner={m.winner ? name(m.winner) : null}
        onConfirm={() => { setMatch(open, { locked: true }, true); setOpen(null); }}
        onBack={() => setOpen(null)}
      />
    );
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 11, color: C.dim }}>A {target} puntos, sin ventaja.</div>
      {list.map((m, i) => (
        <Card key={i} onClick={() => setOpen(i)} style={{ cursor: 'pointer', borderColor: m.locked ? C.line : C.red }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: m.locked ? C.dim : C.red, fontWeight: 800, width: 20 }}>{pref}{m.n}</span>
            <div style={{ flex: 1, display: 'grid', gap: 4 }}>
              <Fila id={m.a} nombre={name(m.a)} score={m.sa} win={m.locked && m.winner === m.a} />
              <Fila id={m.b} nombre={name(m.b)} score={m.sb} win={m.locked && m.winner === m.b} />
            </div>
            {!m.locked && <span style={{ fontSize: 10, color: C.red, letterSpacing: '.14em', fontWeight: 700 }}>JUGAR</span>}
          </div>
        </Card>
      ))}
      {todos && <Btn tone="gold" full onClick={avanzar}>{fase === 'qf' ? 'Ir a semifinales' : 'Ir a la final'}</Btn>}
    </div>
  );
}

const Fila = ({ id, nombre, score, win }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <Avatar id={id} name={nombre} size={24} ring={win ? C.gold : C.line} />
    <span style={{ flex: 1, fontSize: 13.5, fontWeight: win ? 700 : 400, color: win ? C.gold : C.chalk }}>{nombre}</span>
    <span className="num" style={{ fontSize: 17, fontWeight: 800, color: win ? C.gold : C.dim }}>{score}</span>
  </div>
);

/* ── Marcador ── */

function Marcador({ titulo, idA, idB, nameA, nameB, a, b, target, adv, onPoint, winner, winnerId, onConfirm, onBack, extra }) {
  usePantallaViva(true);
  const prev = useRef(null);
  useEffect(() => {
    if (winner && prev.current !== winner) vibra([30, 60, 30, 60, 110]);
    prev.current = winner;
  }, [winner]);

  const tocar = (side, d) => { if (d > 0) vibra(12); onPoint(side, d); };

  const Side = ({ id, n, v, side, lead }) => (
    <div onClick={() => tocar(side, 1)}
      style={{
        background: lead ? C.goldInk : C.card, border: `1px solid ${lead ? C.gold : C.line}`,
        borderRadius: 14, padding: '14px 10px 12px', textAlign: 'center', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 205, justifyContent: 'center',
      }}>
      <Avatar id={id} name={n} size={44} ring={lead ? C.gold : C.line} />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: lead ? C.gold : C.chalk, wordBreak: 'break-word' }}>{n}</div>
      <div className="num" style={{ fontSize: 60, fontWeight: 800, lineHeight: .9, color: lead ? C.gold : C.chalk }}>{v}</div>
      <button onClick={(e) => { e.stopPropagation(); tocar(side, -1); }}
        style={{ background: 'transparent', border: `1px solid ${C.line}`, color: C.dim, borderRadius: 8, padding: '5px 16px', fontSize: 13, cursor: 'pointer' }}>−1</button>
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && <Btn small onClick={onBack}>←</Btn>}
        <Eyebrow color={C.red}>{titulo}</Eyebrow>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.dim }}>a {target}{adv ? ' · ventaja 2' : ' · seco'}</div>
      </div>

      {extra}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Side id={idA} n={nameA} v={a} side="a" lead={a > b} />
        <Side id={idB} n={nameB} v={b} side="b" lead={b > a} />
      </div>

      {winner ? (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <Eyebrow color={C.chalk}>Ganador</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '8px 0 12px' }}>
            <Avatar id={winnerId} name={winner} size={38} ring={C.gold} />
            <div className="num" style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{winner}</div>
          </div>
          <Btn tone="gold" full onClick={onConfirm}>Guardar resultado</Btn>
        </Card>
      ) : (
        <div style={{ fontSize: 11, color: C.dim, textAlign: 'center' }}>Toca el lado del jugador que anota.</div>
      )}
    </div>
  );
}

/* ── Final ── */

function FinalFase({ t, name, update }) {
  const f = t.final, sets = f.sets, idx = sets.length - 1, cur = sets[idx];
  const wa = sets.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length;
  const wb = sets.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length;
  const over = wa >= 2 || wb >= 2;

  const point = (side, d) => {
    if (over && d > 0) return;
    const ns = sets.map((s, i) => (i === idx
      ? { a: side === 'a' ? Math.max(0, s.a + d) : s.a, b: side === 'b' ? Math.max(0, s.b + d) : s.b } : s));
    const tg = setTarget(idx), av = setAdv(idx);
    const cerrado = isWin(ns[idx].a, ns[idx].b, tg, av) || isWin(ns[idx].b, ns[idx].a, tg, av);
    let nw = null;
    if (cerrado) {
      const ca = ns.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length;
      const cb = ns.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length;
      if (ca >= 2) nw = f.a; else if (cb >= 2) nw = f.b; else { ns.push({ a: 0, b: 0 }); vibra([40, 70, 40]); }
    }
    update({ final: { ...f, sets: ns, winner: nw } });
  };

  const marcadorSets = (
    <Card style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, color: wa > wb ? C.gold : C.dim }}>{wa}</div>
      <div style={{ fontSize: 9, letterSpacing: '.2em', color: C.dim }}>SETS</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, color: wb > wa ? C.gold : C.dim }}>{wb}</div>
      <div style={{ marginLeft: 10, display: 'flex', gap: 9 }}>
        {sets.map((s, i) => <div key={i} className="num" style={{ fontSize: 13, color: i === idx && !over ? C.red : C.dim }}>{s.a}-{s.b}</div>)}
      </div>
    </Card>
  );

  return (
    <Marcador
      titulo={`Final · Set ${idx + 1}`}
      idA={f.a} idB={f.b} nameA={name(f.a)} nameB={name(f.b)}
      a={cur.a} b={cur.b} target={setTarget(idx)} adv={setAdv(idx)}
      onPoint={point} winner={f.winner ? name(f.winner) : null} winnerId={f.winner}
      onConfirm={() => update({ final: { ...f, locked: true }, stage: 'resumen' }, true)}
      onBack={null} extra={marcadorSets}
    />
  );
}

/* ── Cálculo ── */

function calcTorneo(t) {
  const pts = {}, dif = {};
  t.entrants.forEach((id) => { pts[id] = 0; dif[id] = 0; });
  t.qualified.forEach((id) => { pts[id] = PTS.clasificar; });
  const acc = (id, f, c) => { dif[id] = (dif[id] || 0) + f - c; };

  (t.qf || []).forEach((m) => { acc(m.a, m.sa, m.sb); acc(m.b, m.sb, m.sa); if (m.winner) pts[m.winner] += PTS.ganarCuartos; });
  (t.sf || []).forEach((m) => { acc(m.a, m.sa, m.sb); acc(m.b, m.sb, m.sa); if (m.winner) pts[m.winner] += PTS.ganarSemis; });
  if (t.final) {
    const fa = t.final.sets.reduce((s, x) => s + x.a, 0);
    const fb = t.final.sets.reduce((s, x) => s + x.b, 0);
    acc(t.final.a, fa, fb); acc(t.final.b, fb, fa);
    if (t.final.winner) pts[t.final.winner] += PTS.ganarFinal;
  }
  return { pts, dif };
}

const etiquetaPts = (p) => (p >= 25 ? 'Campeón' : p >= 15 ? 'Finalista' : p >= 8 ? 'Semifinal' : p >= 3 ? 'Cuartos' : 'Clasificatoria');

function Resumen({ t, name, db, commit, setVer }) {
  const { pts, dif } = useMemo(() => calcTorneo(t), [t]);
  const filas = t.entrants.map((id) => ({ id, pts: pts[id] || 0, dif: dif[id] || 0 }))
    .sort((x, y) => y.pts - x.pts || y.dif - x.dif);

  const finalizar = () =>
    commit({
      ...db,
      tournaments: db.tournaments.map((x) => (x.id === t.id ? { ...x, stage: 'finalizado', result: { pts, dif } } : x)),
      activeId: null,
    }, true);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
        <Eyebrow color={C.chalk}>Campeón {t.name}</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <Avatar id={t.final?.winner} name={t.final?.winner ? name(t.final.winner) : ''} size={52} ring={C.gold} />
          <div className="num" style={{ fontSize: 30, fontWeight: 800, color: C.gold }}>
            {t.final?.winner ? name(t.final.winner) : '—'}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', fontSize: 10, letterSpacing: '.14em', color: C.dim, padding: '0 12px', fontWeight: 700 }}>
        <span style={{ flex: 1 }}>JUGADOR</span>
        <span style={{ width: 44, textAlign: 'right' }}>PTS</span>
        <span style={{ width: 44, textAlign: 'right' }}>DIF</span>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        {filas.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: `1px solid ${r.pts >= 25 ? C.gold : C.line}`, borderRadius: 9, padding: '8px 12px' }}>
            <span className="num" style={{ width: 18, fontSize: 12, color: C.dim }}>{i + 1}</span>
            <Avatar id={r.id} name={name(r.id)} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>{name(r.id)}</div>
              <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: '.08em', textTransform: 'uppercase' }}>{etiquetaPts(r.pts)}</div>
            </div>
            <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 16, fontWeight: 800, color: r.pts ? C.gold : C.dim }}>{r.pts}</span>
            <span className="num" style={{ width: 44, textAlign: 'right', fontSize: 14, color: C.dim }}>{r.dif > 0 ? '+' : ''}{r.dif}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
        La diferencia cuenta lo anotado menos lo recibido de cuartos en adelante.
      </div>
      <Btn onClick={() => setVer({ id: t.id, modo: 'compartir' })}>Compartir resumen</Btn>
      <Btn tone="red" full onClick={finalizar}>Finalizar torneo y sumar al ranking</Btn>
    </div>
  );
}

/* ───────────────────────── estadísticas ───────────────────────── */

const ordenRanking = (a, b) => b.pts - a.pts || b.dif - a.dif;

function agregados(db, seasonId) {
  const acc = {};
  db.tournaments
    .filter((t) => t.stage === 'finalizado' && (!seasonId || t.seasonId === seasonId))
    .forEach((t) => {
      const r = t.result || calcTorneo(t);
      t.entrants.forEach((id) => {
        acc[id] = acc[id] || { id, pts: 0, dif: 0, tor: 0, tit: 0, mejor: 0, finales: 0, clasif: 0 };
        const p = r.pts[id] || 0;
        acc[id].pts += p;
        acc[id].dif += r.dif[id] || 0;
        acc[id].tor += 1;
        acc[id].mejor = Math.max(acc[id].mejor, p);
        if (p >= 15) acc[id].finales += 1;
        if (p >= 3) acc[id].clasif += 1;
      });
      if (t.final?.winner && acc[t.final.winner]) acc[t.final.winner].tit += 1;
    });
  return acc;
}

function partidosDe(db, pid) {
  const out = [];
  db.tournaments.forEach((t) => {
    const push = (fase, m, sa, sb) => {
      const esA = m.a === pid, esB = m.b === pid;
      if (!esA && !esB) return;
      out.push({
        torneo: t.name, fase, rival: esA ? m.b : m.a,
        pf: esA ? sa : sb, pc: esA ? sb : sa, ganado: m.winner === pid,
      });
    };
    (t.qf || []).filter((m) => m.locked).forEach((m) => push('Cuartos', m, m.sa, m.sb));
    (t.sf || []).filter((m) => m.locked).forEach((m) => push('Semifinal', m, m.sa, m.sb));
    if (t.final?.locked) {
      const wa = t.final.sets.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length;
      const wb = t.final.sets.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length;
      push('Final', t.final, wa, wb);
    }
  });
  return out;
}

function rivalTop(db, pid) {
  const riv = {};
  partidosDe(db, pid).forEach((m) => {
    riv[m.rival] = riv[m.rival] || { id: m.rival, n: 0, g: 0, p: 0 };
    riv[m.rival].n += 1;
    if (m.ganado) riv[m.rival].g += 1; else riv[m.rival].p += 1;
  });
  return Object.values(riv).sort((a, b) => b.n - a.n || b.g - a.g)[0] || null;
}

function caraACara(db, a, b) {
  const ms = partidosDe(db, a).filter((m) => m.rival === b);
  return { n: ms.length, g: ms.filter((m) => m.ganado).length, p: ms.filter((m) => !m.ganado).length, ms };
}

function rachaDe(db, pid) {
  let cur = 0, max = 0;
  partidosDe(db, pid).forEach((m) => { if (m.ganado) { cur += 1; max = Math.max(max, cur); } else cur = 0; });
  return max;
}

function listaRecords(db) {
  const ag = agregados(db);
  const arr = Object.values(ag);
  if (!arr.length) return [];
  const mayor = (campo) => arr.slice().sort((x, y) => y[campo] - x[campo])[0];
  const R = [];
  const add = (t, r, v, d) => { if (r && v > 0) R.push({ titulo: t, id: r.id, valor: v, detalle: d }); };

  const tit = mayor('tit'); add('Más títulos', tit, tit.tit, tit.tit === 1 ? '1 torneo ganado' : `${tit.tit} torneos ganados`);
  const fin = mayor('finales'); add('Más finales jugadas', fin, fin.finales, `${fin.finales} de ${fin.tor} torneos`);
  const asi = mayor('tor'); add('Más constante', asi, asi.tor, `${asi.tor} ediciones jugadas`);
  const cla = mayor('clasif'); add('Más veces en cuartos', cla, cla.clasif, `${cla.clasif} clasificaciones`);

  let mejorDif = null;
  db.tournaments.filter((t) => t.stage === 'finalizado').forEach((t) => {
    const r = t.result || calcTorneo(t);
    Object.entries(r.dif).forEach(([id, d]) => {
      if (!mejorDif || d > mejorDif.valor) mejorDif = { id, valor: d, detalle: t.name };
    });
  });
  if (mejorDif && mejorDif.valor > 0) R.push({ titulo: 'Mayor diferencia en un torneo', ...mejorDif, detalle: `+${mejorDif.valor} en ${mejorDif.detalle}` });

  let mejorRacha = null;
  arr.forEach((r) => {
    const v = rachaDe(db, r.id);
    if (!mejorRacha || v > mejorRacha.valor) mejorRacha = { id: r.id, valor: v };
  });
  if (mejorRacha && mejorRacha.valor > 1) R.push({ titulo: 'Racha más larga', ...mejorRacha, detalle: `${mejorRacha.valor} partidos seguidos ganados` });

  const sinTitulo = arr.filter((r) => r.tit === 0).sort((x, y) => y.clasif - x.clasif)[0];
  if (sinTitulo && sinTitulo.clasif > 0) {
    R.push({ titulo: 'El eterno aspirante', id: sinTitulo.id, valor: sinTitulo.clasif, detalle: `${sinTitulo.clasif} veces en cuartos, ningún título` });
  }
  return R;
}

function textoResumen(db, t, name) {
  const dbT = t.stage === 'finalizado'
    ? db
    : { ...db, tournaments: db.tournaments.map((x) => (x.id === t.id ? { ...x, stage: 'finalizado', result: calcTorneo(t) } : x)) };
  const camp = t.final?.winner;
  const fin = t.final && camp ? (camp === t.final.a ? t.final.b : t.final.a) : null;
  const semis = (t.sf || []).filter((m) => m.locked).map((m) => (m.winner === m.a ? m.b : m.a));
  const top = Object.values(agregados(dbT, db.season.id)).sort(ordenRanking).slice(0, 5);

  const L = [];
  L.push('🏓 GRAND SLAM PING PONG SERIES');
  L.push(`${t.name} · Edición ${t.edicion} · ${t.date}`);
  L.push('');
  if (camp) L.push(`🥇 Campeón: ${name(camp)}`);
  if (fin) L.push(`🥈 Finalista: ${name(fin)}`);
  if (semis.length) L.push(`🥉 Semifinales: ${semis.map(name).join(' y ')}`);
  L.push('');
  if (t.final?.locked) {
    L.push(`Final: ${t.final.sets.map((s) => `${s.a}-${s.b}`).join(' / ')}`);
  }
  L.push(`Jugaron ${t.entrants.length} · clasificaron 8`);
  L.push('');
  L.push(`📊 ${db.season.nombre}`);
  top.forEach((r, i) => L.push(`${i + 1}. ${name(r.id)} — ${r.pts} pts`));
  return L.join('\n');
}

/* ───────────────────────── Ranking ───────────────────────── */

function RankingTab({ db, commit }) {
  const [modo, setModo] = useState('temporada');
  const name = (id) => db.players.find((p) => p.id === id)?.name || '?';
  const seasonId = modo === 'temporada' ? db.season.id : null;
  const rows = useMemo(() => Object.values(agregados(db, seasonId)).sort(ordenRanking), [db, seasonId]);
  const recs = useMemo(() => (modo === 'records' ? listaRecords(db) : []), [db, modo]);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado' && (!seasonId || t.seasonId === seasonId)).length;

  const cerrarTemporada = () => {
    if (db.activeId) { alert('Termina el torneo en curso antes de cerrar la temporada.'); return; }
    const tabla = Object.values(agregados(db, db.season.id)).sort(ordenRanking);
    if (!tabla.length) { alert('Esta temporada todavía no tiene torneos finalizados.'); return; }
    if (!confirm(`Cerrar ${db.season.nombre}?\n\nCampeón: ${name(tabla[0].id)} con ${tabla[0].pts} puntos.\nEmpieza una temporada nueva desde cero, pero el ranking histórico sigue sumando.`)) return;
    const cerrada = {
      ...db.season, fin: hoy(), campeon: tabla[0].id,
      tabla: tabla.slice(0, 10).map((r) => ({ id: r.id, pts: r.pts, dif: r.dif })),
      torneos: totalT,
    };
    const seasons = [...db.seasons, cerrada];
    commit({ ...db, seasons, season: { id: uid(), nombre: nombreTemporada({ ...db, seasons }), inicio: hoy() } }, true);
    setModo('temporada');
  };

  const medal = (i) => (i === 0 ? C.gold : i === 1 ? '#9AA0A6' : i === 2 ? '#A0642B' : C.line);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Segmento
        ops={[['temporada', 'Temporada'], ['historico', 'Histórico'], ['records', 'Récords']]}
        val={modo} onChange={setModo} />

      {modo !== 'records' && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Eyebrow color={C.gold}>{modo === 'temporada' ? db.season.nombre : 'Todos los tiempos'}</Eyebrow>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: C.dim }}>{totalT} {totalT === 1 ? 'torneo' : 'torneos'}</div>
          </div>

          {rows.length === 0 ? (
            <Vacio>Todavía no hay torneos finalizados.<br />El ranking aparece cuando cierres el primero.</Vacio>
          ) : (
            <>
              <div style={{ display: 'flex', fontSize: 10, letterSpacing: '.14em', color: C.dim, padding: '0 12px', fontWeight: 700 }}>
                <span style={{ width: 22 }}>#</span>
                <span style={{ flex: 1, marginLeft: 34 }}>JUGADOR</span>
                <span style={{ width: 30, textAlign: 'right' }}>T</span>
                <span style={{ width: 42, textAlign: 'right' }}>DIF</span>
                <span style={{ width: 46, textAlign: 'right' }}>PTS</span>
              </div>
              <div style={{ display: 'grid', gap: 5 }}>
                {rows.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, background: C.card, borderRadius: 10,
                    padding: '9px 12px', border: `1px solid ${C.line}`, borderLeft: `3px solid ${medal(i)}`,
                  }}>
                    <span className="num" style={{ width: 22, fontSize: 14, fontWeight: 800, color: i < 3 ? medal(i) : C.dim }}>{i + 1}</span>
                    <Avatar id={r.id} name={name(r.id)} size={28} ring={i < 3 ? medal(i) : C.line} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: i < 3 ? 700 : 500 }}>
                      {name(r.id)}
                      {r.tit > 0 && <span className="num" style={{ color: C.gold, fontSize: 11, marginLeft: 5 }}>★{r.tit}</span>}
                    </span>
                    <span className="num" style={{ width: 30, textAlign: 'right', fontSize: 12, color: C.dim }}>{r.tor}</span>
                    <span className="num" style={{ width: 42, textAlign: 'right', fontSize: 13, color: C.dim }}>{r.dif > 0 ? '+' : ''}{r.dif}</span>
                    <span className="num" style={{ width: 46, textAlign: 'right', fontSize: 20, fontWeight: 800 }}>{r.pts}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                T = ediciones jugadas · DIF = diferencia de puntos (desempate) · ★ = títulos
              </div>
            </>
          )}

          {modo === 'temporada' && rows.length > 0 && (
            <>
              <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
              <Btn onClick={cerrarTemporada} style={{ borderColor: C.gold, color: C.gold }}>Finalizar temporada</Btn>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                Se guarda el campeón y la tabla, y arranca una temporada nueva. El histórico nunca se reinicia.
              </div>
            </>
          )}

          {db.seasons.length > 0 && (
            <>
              <div style={{ height: 1, background: C.line, margin: '4px 0' }} />
              <Eyebrow>Temporadas cerradas</Eyebrow>
              <div style={{ display: 'grid', gap: 5 }}>
                {[...db.seasons].reverse().map((s) => (
                  <Card key={s.id} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.nombre}</div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{s.inicio} → {s.fin} · {s.torneos || 0} torneos</div>
                    </div>
                    {s.campeon && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Avatar id={s.campeon} name={name(s.campeon)} size={30} ring={C.gold} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{name(s.campeon)}</div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modo === 'records' && (
        recs.length === 0
          ? <Vacio>Los récords aparecen cuando termines tu primer torneo.</Vacio>
          : (
            <div style={{ display: 'grid', gap: 6 }}>
              {recs.map((r, i) => (
                <Card key={i} style={{ padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar id={r.id} name={name(r.id)} size={34} ring={C.gold} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Eyebrow color={C.red}>{r.titulo}</Eyebrow>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{name(r.id)}</div>
                    <div style={{ fontSize: 10.5, color: C.dim, marginTop: 1 }}>{r.detalle}</div>
                  </div>
                  <div className="num" style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{r.valor}</div>
                </Card>
              ))}
            </div>
          )
      )}
    </div>
  );
}

/* ───────────────────────── Jugadores ───────────────────────── */

const Vacio = ({ children }) => (
  <div style={{ padding: '26px 20px', textAlign: 'center', color: C.dim, fontSize: 12.5, lineHeight: 1.6 }}>{children}</div>
);

function JugadoresTab({ db, commit }) {
  const [val, setVal] = useState('');
  const [sel, setSel] = useState(null);

  const add = () => {
    const n = val.trim();
    if (!n || db.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) { setVal(''); return; }
    commit({ ...db, players: [...db.players, { id: uid(), name: n, apodo: '', mano: '', notas: '' }] }, true);
    setVal('');
  };

  if (sel) {
    const p = db.players.find((x) => x.id === sel);
    if (p) return <Perfil p={p} db={db} commit={commit} onBack={() => setSel(null)} />;
  }

  const stats = agregados(db);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Agregar jugador"
          style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '13px 14px', fontSize: 15, outline: 'none' }} />
        <Btn tone="red" onClick={add}>+</Btn>
      </div>

      {db.players.length === 0 && <div style={{ fontSize: 12, color: C.dim }}>Aún no hay jugadores registrados.</div>}

      <div style={{ display: 'grid', gap: 5 }}>
        {[...db.players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
          const s = stats[p.id];
          const asis = s && totalT ? Math.round((s.tor / totalT) * 100) : 0;
          return (
            <Card key={p.id} onClick={() => setSel(p.id)} style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <Avatar id={p.id} name={p.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {p.name}{p.apodo && <span style={{ color: C.dim, fontWeight: 400 }}> · {p.apodo}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>
                  {s ? `${s.tor} de ${totalT} ediciones · ${asis}% · ${s.pts} pts${s.tit ? ` · ★${s.tit}` : ''}` : 'Sin torneos jugados'}
                </div>
              </div>
              <span style={{ color: C.dim, fontSize: 16 }}>›</span>
            </Card>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.dim }}>Toca a un jugador para su ficha, foto, notas y estadísticas.</div>
    </div>
  );
}

function Perfil({ p, db, commit, onBack }) {
  const { fotos, setFoto } = useContext(FotoCtx);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [rival, setRival] = useState('');
  const s = agregados(db)[p.id];
  const usado = db.tournaments.some((t) => t.entrants.includes(p.id));
  const nombreDe = (id) => db.players.find((x) => x.id === id)?.name || '?';
  const partidos = useMemo(() => partidosDe(db, p.id).reverse(), [db, p.id]);
  const top = useMemo(() => rivalTop(db, p.id), [db, p.id]);
  const h2h = useMemo(() => (rival ? caraACara(db, p.id, rival) : null), [db, p.id, rival]);
  const totalT = db.tournaments.filter((t) => t.stage === 'finalizado').length;

  const set = (patch) => commit({ ...db, players: db.players.map((x) => (x.id === p.id ? { ...x, ...patch } : x)) }, true);

  const subir = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { await setFoto(p.id, await comprimirFoto(f)); } catch { }
    setBusy(false);
    e.target.value = '';
  };

  const borrar = () => {
    if (confirm(`Borrar a ${p.name} del registro?`)) {
      setFoto(p.id, null);
      commit({ ...db, players: db.players.filter((x) => x.id !== p.id) }, true);
      onBack();
    }
  };

  const Campo = ({ label, value, onSave, multi, placeholder }) => (
    <div>
      <Eyebrow>{label}</Eyebrow>
      {multi ? (
        <textarea defaultValue={value} placeholder={placeholder} onBlur={(e) => onSave(e.target.value)}
          style={{ width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '10px 12px', fontSize: 14, minHeight: 78, outline: 'none', resize: 'vertical' }} />
      ) : (
        <input defaultValue={value} placeholder={placeholder} onBlur={(e) => onSave(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          style={{ width: '100%', marginTop: 6, background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: '11px 12px', fontSize: 15, outline: 'none' }} />
      )}
    </div>
  );

  const Stat = ({ k, v, color }) => (
    <Card style={{ padding: '10px 6px', textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 23, fontWeight: 800, color: color || C.chalk, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 8.5, letterSpacing: '.12em', color: C.dim, marginTop: 5, fontWeight: 700 }}>{k}</div>
    </Card>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn small onClick={onBack}>←</Btn>
        <Eyebrow>Ficha del jugador</Eyebrow>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => fileRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
          <Avatar id={p.id} name={p.name} size={86} ring={C.gold} />
          <div style={{ position: 'absolute', bottom: -2, right: -2, background: C.red, color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'grid', placeItems: 'center', fontSize: 13, border: `2px solid ${C.ink}` }}>
            {busy ? '…' : '+'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{p.name}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
            {fotos[p.id] ? 'Toca la foto para cambiarla' : 'Toca para agregar una foto'}
          </div>
          {fotos[p.id] && <Btn small onClick={() => setFoto(p.id, null)} style={{ marginTop: 8 }}>Quitar foto</Btn>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={subir} style={{ display: 'none' }} />

      {s && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
            <Stat k="PTS" v={s.pts} color={C.gold} />
            <Stat k="DIF" v={(s.dif > 0 ? '+' : '') + s.dif} />
            <Stat k="EDICIONES" v={s.tor} />
            <Stat k="TÍTULOS" v={s.tit} color={s.tit ? C.gold : undefined} />
          </div>
          <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
            Mejor resultado: {etiquetaPts(s.mejor)} · Asistencia: {s.tor} de {totalT} ediciones ({totalT ? Math.round((s.tor / totalT) * 100) : 0}%)
            {rachaDe(db, p.id) > 1 && ` · Mejor racha: ${rachaDe(db, p.id)} seguidos`}
          </div>
        </>
      )}

      <Campo label="Nombre" value={p.name} placeholder="Nombre completo" onSave={(v) => set({ name: v.trim() || p.name })} />
      <Campo label="Apodo" value={p.apodo || ''} placeholder="Cómo le dicen en la mesa" onSave={(v) => set({ apodo: v.trim() })} />

      <div>
        <Eyebrow>Mano</Eyebrow>
        <div style={{ marginTop: 6 }}>
          <Segmento ops={[['Diestro', 'Diestro'], ['Zurdo', 'Zurdo']]} val={p.mano}
            onChange={(m) => set({ mano: p.mano === m ? '' : m })} />
        </div>
      </div>

      <Campo label="Notas" multi value={p.notas || ''} placeholder="Estilo de juego, saque, con qué se le gana…" onSave={(v) => set({ notas: v })} />

      {!usado && <Btn onClick={borrar} style={{ borderColor: C.red, color: C.red }}>Borrar jugador</Btn>}
      {usado && <div style={{ fontSize: 10, color: C.dim }}>No se puede borrar: ya tiene torneos jugados.</div>}

      <div style={{ height: 1, background: C.line, margin: '2px 0' }} />

      <div>
        <Eyebrow>Cara a cara</Eyebrow>
        <select value={rival} onChange={(e) => setRival(e.target.value)}
          style={{ width: '100%', marginTop: 7, background: C.card, color: C.chalk, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 10px', fontSize: 14 }}>
          <option value="">Elige un rival…</option>
          {db.players.filter((x) => x.id !== p.id).sort((a, b) => a.name.localeCompare(b.name))
            .map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {h2h && (
          h2h.n === 0
            ? <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8 }}>Nunca se han enfrentado de cuartos en adelante.</div>
            : (
              <Card style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar id={p.id} name={p.name} size={34} ring={h2h.g > h2h.p ? C.gold : C.line} />
                  <div className="num" style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 800 }}>
                    <span style={{ color: h2h.g >= h2h.p ? C.gold : C.dim }}>{h2h.g}</span>
                    <span style={{ color: C.dim, margin: '0 6px' }}>-</span>
                    <span style={{ color: h2h.p > h2h.g ? C.red : C.dim }}>{h2h.p}</span>
                  </div>
                  <Avatar id={rival} name={nombreDe(rival)} size={34} ring={h2h.p > h2h.g ? C.red : C.line} />
                </div>
                <div style={{ display: 'grid', gap: 3, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                  {h2h.ms.slice().reverse().map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                      <span style={{ color: m.ganado ? C.gold : C.red, fontWeight: 700, width: 12 }}>{m.ganado ? 'G' : 'P'}</span>
                      <span className="num" style={{ width: 40, fontWeight: 700 }}>{m.pf}-{m.pc}</span>
                      <span style={{ flex: 1, color: C.dim }}>{m.fase} · {m.torneo}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )
        )}
      </div>

      {top && (
        <div>
          <Eyebrow>Rival más frecuente</Eyebrow>
          <Card style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }} onClick={() => setRival(top.id)}>
            <Avatar id={top.id} name={nombreDe(top.id)} size={40} ring={C.red} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{nombreDe(top.id)}</div>
              <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{top.n} {top.n === 1 ? 'duelo' : 'duelos'} de cuartos en adelante</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: top.g >= top.p ? C.gold : C.dim }}>{top.g}</span>
                <span style={{ color: C.dim, margin: '0 3px' }}>-</span>
                <span style={{ color: top.p > top.g ? C.red : C.dim }}>{top.p}</span>
              </div>
              <div style={{ fontSize: 8.5, letterSpacing: '.16em', color: C.dim, fontWeight: 700, marginTop: 4 }}>G - P</div>
            </div>
          </Card>
        </div>
      )}

      <div>
        <Eyebrow>Últimos 5 partidos</Eyebrow>
        {partidos.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 7 }}>Todavía no ha jugado partidos de cuartos en adelante.</div>
        ) : (
          <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>
            {partidos.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 10px' }}>
                <span className="num" style={{ width: 20, height: 20, borderRadius: 5, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0, background: m.ganado ? C.gold : C.redInk, color: m.ganado ? '#191400' : C.red }}>
                  {m.ganado ? 'G' : 'P'}
                </span>
                <Avatar id={m.rival} name={nombreDe(m.rival)} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreDe(m.rival)}</div>
                  <div style={{ fontSize: 9, color: C.dim, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>{m.fase} · {m.torneo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 15, fontWeight: 800, color: m.ganado ? C.gold : C.dim }}>{m.pf}-{m.pc}</div>
                  {m.fase === 'Final' && <div style={{ fontSize: 8, color: C.dim, letterSpacing: '.1em' }}>SETS</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Datos ───────────────────────── */

function DatosTab({ db, commit }) {
  const { fotos } = useContext(FotoCtx);
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

/* ───────────────────────── Detalle: cuadro, registro y compartir ───────────────────────── */

function Detalle({ t, db, name, modo, setModo, onBack }) {
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

const Baja = () => (
  <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}>
    <div style={{ width: 1, height: 16, background: C.line }} />
  </div>
);

function CuadroCompleto({ t, name }) {
  if (!t.qf) return <Vacio>El cuadro aparece cuando se completen los 8 clasificados.</Vacio>;

  const seed = (id) => { const i = t.qualified.indexOf(id); return i >= 0 ? `A${i + 1}` : ''; };

  const Duelo = ({ et, a, b, sa, sb, winner, listo, tone }) => (
    <Card style={{ padding: '9px 11px', borderColor: tone || C.line }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="num" style={{ fontSize: 10, fontWeight: 800, color: tone || C.dim, width: 20 }}>{et}</span>
        <div style={{ flex: 1, display: 'grid', gap: 5 }}>
          {[[a, sa], [b, sb]].map(([id, s], i) => {
            const gana = listo && winner === id;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar id={id} name={name(id)} size={22} ring={gana ? C.gold : C.line} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: gana ? 700 : 400, color: gana ? C.gold : C.chalk, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name(id)}</span>
                {seed(id) && <span className="num" style={{ fontSize: 10, color: C.dim }}>{seed(id)}</span>}
                <span className="num" style={{ fontSize: 15, fontWeight: 800, width: 20, textAlign: 'right', color: gana ? C.gold : C.dim }}>
                  {listo || sa || sb ? s : '·'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );

  const PorJugar = ({ et, texto }) => (
    <Card style={{ padding: '13px 11px', borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="num" style={{ fontSize: 10, fontWeight: 800, color: C.dim, width: 20 }}>{et}</span>
      <span style={{ fontSize: 12, color: C.dim }}>{texto}</span>
    </Card>
  );

  const f = t.final;
  const wa = f ? f.sets.filter((s, i) => isWin(s.a, s.b, setTarget(i), setAdv(i))).length : 0;
  const wb = f ? f.sets.filter((s, i) => isWin(s.b, s.a, setTarget(i), setAdv(i))).length : 0;

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      {[0, 1].map((r) => {
        const m1 = t.qf[r === 0 ? 0 : 1], m2 = t.qf[r === 0 ? 2 : 3];
        const s = t.sf ? t.sf[r] : null;
        return (
          <div key={r} style={{ display: 'grid', gap: 6 }}>
            <Eyebrow color={C.red}>Rama {r + 1}</Eyebrow>
            <Duelo et={`C${m1.n}`} a={m1.a} b={m1.b} sa={m1.sa} sb={m1.sb} winner={m1.winner} listo={m1.locked} />
            <Duelo et={`C${m2.n}`} a={m2.a} b={m2.b} sa={m2.sa} sb={m2.sb} winner={m2.winner} listo={m2.locked} />
            <Baja />
            {s ? <Duelo et={`S${s.n}`} a={s.a} b={s.b} sa={s.sa} sb={s.sb} winner={s.winner} listo={s.locked} tone={C.gold} />
              : <PorJugar et={`S${r + 1}`} texto="Espera a los ganadores de cuartos" />}
          </div>
        );
      })}

      <div style={{ height: 1, background: C.line }} />
      <Eyebrow color={C.gold}>Final</Eyebrow>
      {f ? (
        <Card style={{ borderColor: C.gold, background: f.locked ? C.goldInk : C.card }}>
          {[[f.a, wa], [f.b, wb]].map(([id, w], i) => {
            const gana = f.locked && f.winner === id;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <Avatar id={id} name={name(id)} size={30} ring={gana ? C.gold : C.line} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: gana ? 700 : 400, color: gana ? C.gold : C.chalk }}>{name(id)}</span>
                <span className="num" style={{ fontSize: 22, fontWeight: 800, color: gana ? C.gold : C.dim }}>{w}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 9, letterSpacing: '.16em', color: C.dim, fontWeight: 700 }}>SETS</span>
            {f.sets.map((s, i) => <span key={i} className="num" style={{ fontSize: 13, color: C.dim }}>{s.a}-{s.b}</span>)}
          </div>
        </Card>
      ) : <PorJugar et="F" texto="Espera a los ganadores de semifinales" />}

      {f?.winner && (
        <Card style={{ background: C.goldInk, borderColor: C.gold, textAlign: 'center' }}>
          <Eyebrow color={C.chalk}>Campeón</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 }}>
            <Avatar id={f.winner} name={name(f.winner)} size={40} ring={C.gold} />
            <div className="num" style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{name(f.winner)}</div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Registro({ t, name }) {
  const { pts, dif } = useMemo(() => calcTorneo(t), [t]);
  const noClas = t.entrants.filter((id) => !t.qualified.includes(id));
  const tabla = t.entrants.map((id) => ({ id, pts: pts[id] || 0, dif: dif[id] || 0 })).sort(ordenRanking);

  const Sec = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <Eyebrow color={C.red}>{children}</Eyebrow>
      <div style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );

  const Linea = ({ et, a, b, sa, sb, w }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 9 }}>
      <span className="num" style={{ fontSize: 10, color: C.dim, fontWeight: 800, width: 18 }}>{et}</span>
      <span style={{ flex: 1, fontSize: 12.5, textAlign: 'right', fontWeight: w === a ? 700 : 400, color: w === a ? C.gold : C.chalk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(a)}</span>
      <span className="num" style={{ fontSize: 15, fontWeight: 800, minWidth: 42, textAlign: 'center' }}>{sa}<span style={{ color: C.dim, margin: '0 2px' }}>-</span>{sb}</span>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: w === b ? 700 : 400, color: w === b ? C.gold : C.chalk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(b)}</span>
    </div>
  );

  return (
    <div style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 11.5, color: C.dim }}>
        {t.date} · {t.entrants.length} inscritos · {t.stage === 'finalizado' ? 'finalizado' : 'en curso'}
      </div>

      {t.groups && (
        <>
          <Sec>Lados de la mesa</Sec>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 10 }}>
            <ColOrden titulo="Izquierda" ids={t.groups.izq} name={name} />
            <div style={{ background: C.line }} />
            <ColOrden titulo="Derecha" ids={t.groups.der} name={name} />
          </div>
        </>
      )}

      {t.qualified.length > 0 && (
        <>
          <Sec>Orden de clasificación</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.qualified.map((id, i) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 9 }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 800, color: C.gold, width: 22 }}>A{i + 1}</span>
                <Avatar id={id} name={name(id)} size={24} />
                <span style={{ flex: 1, fontSize: 13 }}>{name(id)}</span>
                <span className="num" style={{ fontSize: 13, color: C.dim }}>7 pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      {noClas.length > 0 && (
        <>
          <Sec>No clasificaron</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {noClas.slice().sort((a, b) => (t.clas[b] || 0) - (t.clas[a] || 0)).map((id) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                <Avatar id={id} name={name(id)} size={22} />
                <span style={{ flex: 1, fontSize: 12.5, color: C.dim }}>{name(id)}</span>
                <Pips n={t.clas[id] || 0} on={C.red} />
                <span className="num" style={{ fontSize: 12, color: C.dim, width: 34, textAlign: 'right' }}>{t.clas[id] || 0} pts</span>
              </div>
            ))}
          </div>
        </>
      )}

      {t.qf && (
        <>
          <Sec>Cuartos de final</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.qf.map((m) => <Linea key={m.n} et={`C${m.n}`} a={m.a} b={m.b} sa={m.sa} sb={m.sb} w={m.locked ? m.winner : null} />)}
          </div>
        </>
      )}

      {t.sf && (
        <>
          <Sec>Semifinales</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.sf.map((m) => <Linea key={m.n} et={`S${m.n}`} a={m.a} b={m.b} sa={m.sa} sb={m.sb} w={m.locked ? m.winner : null} />)}
          </div>
        </>
      )}

      {t.final && (
        <>
          <Sec>Final</Sec>
          <div style={{ display: 'grid', gap: 4 }}>
            {t.final.sets.map((s, i) => (
              <Linea key={i} et={`${i + 1}º`} a={t.final.a} b={t.final.b} sa={s.a} sb={s.b}
                w={isWin(s.a, s.b, setTarget(i), setAdv(i)) ? t.final.a : isWin(s.b, s.a, setTarget(i), setAdv(i)) ? t.final.b : null} />
            ))}
          </div>
        </>
      )}

      <Sec>Puntos del torneo</Sec>
      <div style={{ display: 'grid', gap: 4 }}>
        {tabla.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: C.card, border: `1px solid ${r.pts >= 25 ? C.gold : C.line}`, borderRadius: 9 }}>
            <span className="num" style={{ width: 16, fontSize: 11, color: C.dim }}>{i + 1}</span>
            <Avatar id={r.id} name={name(r.id)} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5 }}>{name(r.id)}</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: '.08em', textTransform: 'uppercase' }}>{etiquetaPts(r.pts)}</div>
            </div>
            <span className="num" style={{ fontSize: 12, color: C.dim, width: 34, textAlign: 'right' }}>{r.dif > 0 ? '+' : ''}{r.dif}</span>
            <span className="num" style={{ fontSize: 17, fontWeight: 800, color: r.pts ? C.gold : C.dim, width: 30, textAlign: 'right' }}>{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Compartir({ t, db, name }) {
  const texto = useMemo(() => textoResumen(db, t, name), [db, t]);
  const [msg, setMsg] = useState('');
  const ref = useRef(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      vibra(20); setMsg('Copiado. Pégalo en el grupo.');
    } catch {
      try { ref.current?.select(); document.execCommand('copy'); setMsg('Copiado.'); }
      catch { setMsg('Selecciona el texto y cópialo a mano.'); }
    }
  };

  const compartir = async () => {
    try { await navigator.share({ text: texto }); } catch { }
  };

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <Eyebrow>Resumen para el grupo</Eyebrow>
      <textarea ref={ref} readOnly value={texto}
        style={{ background: C.card, border: `1px solid ${C.line}`, color: C.chalk, borderRadius: 10, padding: 14, fontSize: 13, minHeight: 300, outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--ui)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: typeof navigator !== 'undefined' && navigator.share ? '1fr 1fr' : '1fr', gap: 8 }}>
        <Btn tone="gold" onClick={copiar}>Copiar</Btn>
        {typeof navigator !== 'undefined' && navigator.share && <Btn tone="red" onClick={compartir}>Compartir</Btn>}
      </div>
      {msg && <div style={{ fontSize: 12, color: C.gold }}>{msg}</div>}
      <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.6 }}>
        Puedes editar el texto antes de copiarlo. El ranking mostrado es el de {db.season.nombre}.
      </div>
    </div>
  );
}
