"use client";

import { useEffect } from 'react';
import { useElectionAuth } from '@/hooks/useElectionAuth';

export default function ElectionLayout({ children }: { children: React.ReactNode }) {
  useElectionAuth();

  useEffect(() => {
    // ── Disable right-click context menu ──
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // ── Block common DevTools keyboard shortcuts ──
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl+Shift+I / Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') { e.preventDefault(); return; }
      // Ctrl+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') { e.preventDefault(); return; }
      // Ctrl+Shift+C (Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') { e.preventDefault(); return; }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); return; }
      // Ctrl+S (Save page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); return; }
    };

    // ── Detect DevTools via window size threshold (desktop only) ──
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
      navigator.userAgent
    ) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const detectDevTools = () => {
      // Skip on mobile — browser chrome causes false positives
      if (isMobile) return;

      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        document.body.innerHTML = `
          <div style="
            min-height:100vh;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            background:#f9fafb;
            font-family:sans-serif;
            text-align:center;
            padding:24px;
          ">
            <div style="
              background:white;
              border:1px solid #e5e7eb;
              border-radius:16px;
              padding:48px 40px;
              max-width:420px;
              box-shadow:0 4px 24px rgba(0,0,0,0.08);
            ">
              <div style="
                width:64px;height:64px;
                background:#fee2e2;
                border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                margin:0 auto 20px;
                font-size:28px;
              ">🔒</div>
              <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 10px;">
                Access Restricted
              </h1>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Developer tools have been detected. Please close them and reload the page to continue.
              </p>
              <button
                onclick="window.location.reload()"
                style="
                  background:#15803d;color:white;
                  border:none;border-radius:8px;
                  padding:12px 28px;
                  font-size:15px;font-weight:600;
                  cursor:pointer;
                "
              >
                Reload Page
              </button>
            </div>
          </div>
        `;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    const devToolsInterval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(devToolsInterval);
    };
  }, []);

  return <>{children}</>;
}
