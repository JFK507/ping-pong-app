// src/constants/config.js

// Storage
export const K_STATE = "gs_state_v2";
export const K_FOTOS = "gs_fotos_v1";

// Puntuación
export const PTS = {
  clasificar: 3,
  ganarCuartos: 5,
  ganarSemis: 7,
  ganarFinal: 10,
};

// Reglas del torneo
export const TARGET_QF = 7;
export const TARGET_SF = 10;

// Etapas del torneo
export const STAGES = [
  ["inscripcion", "Inscripción"],
  ["orden", "Orden"],
  ["clasificacion", "Clasificación"],
  ["cuadro", "Cuadro"],
  ["cuartos", "Cuartos"],
  ["semis", "Semis"],
  ["final", "Final"],
  ["resumen", "Resumen"],
];