
import { NOMBRES } from "../constants/nombres";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) +
  Date.now().toString(36).slice(-3);

export const hoy = () =>
  new Date().toISOString().slice(0, 10);

export function nombreLibre(usados) {
  const libres = NOMBRES.filter((n) => !usados.includes(n));
  const pool = libres.length ? libres : NOMBRES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function nombreTemporada(db) {
  const y = new Date().getFullYear();

  const usados = [
    ...(db.seasons || []).map((s) => s.nombre),
    db.season?.nombre,
  ].filter(Boolean);

  let n = `Temporada ${y}`;
  const romanos = ["II", "III", "IV", "V", "VI"];

  let i = 0;

  while (usados.includes(n) && i < romanos.length) {
    n = `Temporada ${y} · ${romanos[i]}`;
    i++;
  }

  return n;
}

export function emptyDB() {
  const year = new Date().getFullYear();

  return {
    version: 3,
    players: [],
    tournaments: [],
    activeId: null,
    season: {
      id: uid(),
      nombre: `Temporada ${year}`,
      inicio: hoy(),
    },
    seasons: [],
  };
}
export function migrar(d) {
  if (!d || !d.players) return emptyDB();

  if (!d.season) {
    const year = new Date().getFullYear();

    const s = {
      id: uid(),
      nombre: `Temporada ${year}`,
      inicio: hoy(),
    };

    d.season = s;
    d.seasons = d.seasons || [];

    d.tournaments = (d.tournaments || []).map((t) => ({
      ...t,
      seasonId: t.seasonId || s.id,
    }));
  }

  d.seasons = d.seasons || [];

  d.tournaments = (d.tournaments || []).map((t) => ({
    ...t,
    seasonId: t.seasonId || d.season.id,
  }));

  return d;
}