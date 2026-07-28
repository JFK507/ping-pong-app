import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { K_FOTOS } from '../constants/config';

const FotoCtx = createContext({ fotos: {}, setFoto: () => {} });

export function FotoProvider({ children }) {
  const [fotos, setFotos] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(K_FOTOS);
        if (r) setFotos(JSON.parse(r.value));
      } catch { }
    })();
  }, []);

  const setFoto = useCallback(async (id, dataUrl) => {
    setFotos((prev) => {
      const next = { ...prev };
      if (dataUrl) next[id] = dataUrl; else delete next[id];
      window.storage.set(K_FOTOS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return React.createElement(FotoCtx.Provider, { value: { fotos, setFoto } }, children);
}

export const useFotos = () => useContext(FotoCtx);
