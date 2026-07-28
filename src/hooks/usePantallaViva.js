import { useEffect } from 'react';

export function usePantallaViva(activo) {
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
