"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const SESSION_TTL = 6 * 60 * 60 * 1000; // 6 hours
const CHECK_INTERVAL = 30 * 1000; // check every 30s

/**
 * Returns true if the voter session in localStorage is still valid.
 */
function isSessionValid(): boolean {
  const token = localStorage.getItem('voterToken');
  const data = localStorage.getItem('voterData');
  const ts = localStorage.getItem('voterTokenTimestamp');

  if (!token || !data || !ts) return false;

  const elapsed = Date.now() - parseInt(ts, 10);
  return elapsed < SESSION_TTL;
}

function clearSession() {
  localStorage.removeItem('voterToken');
  localStorage.removeItem('voterData');
  localStorage.removeItem('voterTokenTimestamp');
}

/**
 * Hook that guards election pages behind voter authentication.
 * - Redirects to /election/login if no valid session exists.
 * - Polls every 30s and redirects in real-time when the session expires.
 * - Skips the guard on the login page itself.
 */
export function useElectionAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const kick = useCallback(() => {
    clearSession();
    router.replace('/election/login');
  }, [router]);

  useEffect(() => {
    // Don't guard the login page or the no-access page — neither requires
    // (or can have) a voter session, and no-access must stay reachable
    // without one to avoid a redirect loop with the login-page middleware.
    if (pathname === '/election/login' || pathname === '/election/no-access') return;

    // Immediate check
    if (!isSessionValid()) {
      kick();
      return;
    }

    // Periodic check for real-time expiry detection
    timerRef.current = setInterval(() => {
      if (!isSessionValid()) {
        kick();
      }
    }, CHECK_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname, kick]);
}
