'use client';

import { useEffect } from 'react';

export function AutoPrint() {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}
