"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

const CHECK_INTERVAL_MS = 1000;
const SIZE_THRESHOLD_PX = 160;
const CONSECUTIVE_CHECKS_REQUIRED = 3;

function isLikelyTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

export default function DevToolsGuard() {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (isLikelyTouchDevice()) return;

    let consecutiveHits = 0;

    const check = () => {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const looksOpen =
        widthDelta > SIZE_THRESHOLD_PX || heightDelta > SIZE_THRESHOLD_PX;

      consecutiveHits = looksOpen ? consecutiveHits + 1 : 0;
      setDetected(consecutiveHits >= CONSECUTIVE_CHECKS_REQUIRED);
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!detected) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#1C2338]/98 backdrop-blur-sm px-6 text-center">
      <div>
        <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="text-[#D4AF37]" size={28} />
        </div>
        <h1 className="text-white font-bold text-lg mb-2">
          Developer Tools Detected
        </h1>
        <p className="text-gray-300 text-sm max-w-sm mx-auto">
          Please close developer tools to continue. Nothing on this page has
          been lost — it will reappear automatically once they're closed.
        </p>
      </div>
    </div>
  );
}
