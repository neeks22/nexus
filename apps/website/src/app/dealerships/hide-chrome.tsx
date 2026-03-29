'use client';

import { useEffect } from 'react';

export function HideGlobalChrome() {
  useEffect(() => {
    document.body.setAttribute('data-landing', 'true');
    return () => {
      document.body.removeAttribute('data-landing');
    };
  }, []);

  return null;
}
