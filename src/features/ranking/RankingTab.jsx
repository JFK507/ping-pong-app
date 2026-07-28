import { useMemo, useState } from 'react';
import { C } from '../../constants/colors';
import { uid, hoy, nombreTemporada } from '../../utils/database';
import { agregados, ordenRanking, listaRecords } from '../../utils/stats';
import { Segmento } from '../../components/Segmento';
import { Eyebrow } from '../../components/Eyebrow';
import { Vacio } from '../../components/Vacio';
import { Avatar } from '../../components/Avatar';
import { Card } from '../../components/Card';
import { Btn } from '../../components/Btn';

export function RankingTab({ db, commit }) {
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
