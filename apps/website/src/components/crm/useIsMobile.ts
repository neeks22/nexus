'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

function getInitialValue(): boolean {
  if (typeof window !== 'undefined') {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }
  return false;
}

export default function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getInitialValue);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mql.matches);

    function onChange(e: MediaQueryListEvent): void {
      setIsMobile(e.matches);
    }

    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
