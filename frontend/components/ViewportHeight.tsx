// components/ViewportHeight.tsx
'use client';

import { useEffect } from 'react';

export default function ViewportHeight() {
  useEffect(() => {
    const setVhVariable = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVhVariable();
    window.addEventListener('resize', setVhVariable);
    return () => window.removeEventListener('resize', setVhVariable);
  }, []);

  return null; // this component just runs effect, renders nothing
}