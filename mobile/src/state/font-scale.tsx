import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { FONT_SCALES, parseFontScale, scaleOf, type FontScaleKey } from '@/lib/font-scale';
import { prefStore } from '@/lib/storage';

type Ctx = { key: FontScaleKey; scale: number; setKey: (k: FontScaleKey) => void };

const FontScaleContext = createContext<Ctx>({ key: 'normal', scale: 1, setKey: () => undefined });

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [key, setKeyState] = useState<FontScaleKey>('normal');

  useEffect(() => {
    let alive = true;
    void prefStore.get('fontScale').then((v) => alive && setKeyState(parseFontScale(v)));
    return () => { alive = false; };
  }, []);

  const setKey = useCallback((k: FontScaleKey) => {
    setKeyState(k);
    void prefStore.set('fontScale', k);
  }, []);

  const value = useMemo(() => ({ key, scale: scaleOf(key), setKey }), [key, setKey]);
  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export const useFontScale = () => useContext(FontScaleContext);
export { FONT_SCALES };
