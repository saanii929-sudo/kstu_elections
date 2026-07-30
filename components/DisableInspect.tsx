'use client';

import { useEffect } from 'react';

// Deterrent only, not a security control — DevTools can still be opened
// from the browser's own menu, "view-source:" typed directly in the
// address bar can't be blocked from JS, and none of this affects network
// request inspection. Actual data protection lives server-side (auth
// checks, field filtering) — this just discourages casual right-click/
// inspect-element poking on every page.
export default function DisableInspect() {
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      if (!e.key) return;
      const key = e.key.toUpperCase();
      const devToolsCombo =
        key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && key === 'U');

      if (devToolsCombo) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  return null;
}
