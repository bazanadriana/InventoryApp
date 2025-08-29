import { useEffect, useRef } from 'react';

/**
 * Call like:
 * useAutosave(state, async (s)=> await saveInventory(s), ()=>version, (v)=>setVersion(v))
 */
export function useAutosave<T>(
  deps: T,
  save: (state: T) => Promise<number | void>,
  getVersion: () => number,
  setVersion: (v: number) => void
) {
  const latest = useRef(deps);
  useEffect(() => { latest.current = deps; }, [deps]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const newVersion = (await save(latest.current)) ?? undefined;
        if (typeof newVersion === 'number' && newVersion !== getVersion()) {
          setVersion(newVersion);
        }
      } catch (e: any) {
        // optionally surface 409 here
        // console.error(e);
      }
    }, 8000);
    return () => clearInterval(t);
  }, []);
}
