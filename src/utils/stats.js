// src/utils/stats.js
import { PTS } from '../constants/config';
import { setTarget, setAdv, isWin } from './torneo';

export const ordenRanking = (a, b) => b.pts - a.pts || b.dif - a.dif;

export const etiquetaPts = (p) => (p >= 25 ? 'Campeón' : p >= 15 ? 'Finalista' : p >= 8 ? 'Semifinal' : p >= 3 ? 'Cuartos' : 'Clasificatoria');

export function calcTorneo(t) {
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

export function agregados(db, seasonId) {
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

export function partidosDe(db, pid) {
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

export function rivalTop(db, pid) {
  const riv = {};
  partidosDe(db, pid).forEach((m) => {
    riv[m.rival] = riv[m.rival] || { id: m.rival, n: 0, g: 0, p: 0 };
    riv[m.rival].n += 1;
    if (m.ganado) riv[m.rival].g += 1; else riv[m.rival].p += 1;
  });
  return Object.values(riv).sort((a, b) => b.n - a.n || b.g - a.g)[0] || null;
}

export function caraACara(db, a, b) {
  const ms = partidosDe(db, a).filter((m) => m.rival === b);
  return { n: ms.length, g: ms.filter((m) => m.ganado).length, p: ms.filter((m) => !m.ganado).length, ms };
}

export function rachaDe(db, pid) {
  let cur = 0, max = 0;
  partidosDe(db, pid).forEach((m) => { if (m.ganado) { cur += 1; max = Math.max(max, cur); } else cur = 0; });
  return max;
}

export function listaRecords(db) {
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

export function textoResumen(db, t, name) {
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
