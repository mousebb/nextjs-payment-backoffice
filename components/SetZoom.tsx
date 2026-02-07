// components/SetZoom.tsx
'use client';

import { useEffect } from 'react';

export default function SetZoom() {
  useEffect(() => {
    if (window.location.pathname !== '/login') {
      document.body.style.zoom = '1';
    }
  }, []);

  return null;
}
