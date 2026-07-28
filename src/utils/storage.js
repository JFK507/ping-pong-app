import { K_STATE } from "../constants/config";
import { emptyDB, migrar } from "./database";

if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const val = localStorage.getItem(key);
        return val ? { value: val } : null;
      } catch {
        return null;
      }
    },

    set: async (key, val) => {
      try {
        localStorage.setItem(key, val);
      } catch (e) {
        console.error("Error al guardar en storage", e);
      }
    },
  };
}

const storage = window.storage;

export async function load() {
  try {
    const r = await storage.get(K_STATE);

    if (!r?.value) {
      return emptyDB();
    }

    return migrar(JSON.parse(r.value));
  } catch {
    return emptyDB();
  }
}

export async function save(db) {
  await storage.set(K_STATE, JSON.stringify(db));
}

export async function clear() {
  localStorage.removeItem(K_STATE);
}