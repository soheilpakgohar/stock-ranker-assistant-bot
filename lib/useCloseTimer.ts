import { useRef, useCallback } from 'react';

/**
 * Shared close-timer hook. Tracks a single timeout, clearing any previous
 * timer before setting a new one — so rapid successive actions don't stack.
 * Used by FormTab, AppleTab (close the Mini App), and InventoryTab (close sheet).
 */
export function useCloseTimer() {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((fn: () => void, ms: number) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  }, []);

  const clear = useCallback(() => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  return { schedule, clear };
}
