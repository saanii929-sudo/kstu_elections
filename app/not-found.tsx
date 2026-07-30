"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div
          className={`max-w-lg w-full text-center transition-all duration-600 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative flex items-center justify-center mb-10 select-none">
            <div className="absolute w-64 h-64 rounded-full bg-green-50 blur-3xl opacity-60" />
            <div className="relative flex items-end justify-center gap-1 sm:gap-2">
              <span
                className="text-[96px] sm:text-[130px] font-black leading-none text-gray-900 tracking-tight"
                style={{ animation: "float 3.2s ease-in-out infinite" }}
              >
                4
              </span>
              <div
                className="relative flex items-center justify-center"
                style={{ animation: "float 3.2s ease-in-out infinite 0.4s" }}
              >
                <span className="text-[96px] sm:text-[130px] font-black leading-none text-green-500 tracking-tight">
                  0
                </span>
                <div className="absolute flex gap-2.5 sm:gap-3 top-[30%]">
                  <span
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"
                    style={{ animation: "blink 3.5s ease-in-out infinite" }}
                  />
                  <span
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"
                    style={{
                      animation: "blink 3.5s ease-in-out infinite 0.15s",
                    }}
                  />
                </div>
                <div className="absolute bottom-[28%] w-3.5 sm:w-4.5 h-1.75 sm:h-2.25 border-b-2 border-white rounded-b-full" />
              </div>
              <span
                className="text-[96px] sm:text-[130px] font-black leading-none text-gray-900 tracking-tight"
                style={{ animation: "float 3.2s ease-in-out infinite 0.8s" }}
              >
                4
              </span>
            </div>
            <div
              className="absolute top-2 left-6 w-2 h-2 rounded-full bg-green-300 opacity-70"
              style={{ animation: "floatDot 4s ease-in-out infinite" }}
            />
            <div
              className="absolute top-8 right-4 w-1.5 h-1.5 rounded-full bg-gray-300 opacity-60"
              style={{ animation: "floatDot 4s ease-in-out infinite 1s" }}
            />
            <div
              className="absolute bottom-4 left-10 w-1.5 h-1.5 rounded-full bg-green-200 opacity-80"
              style={{ animation: "floatDot 4s ease-in-out infinite 2s" }}
            />
            <div
              className="absolute bottom-2 right-12 w-2 h-2 rounded-full bg-gray-200 opacity-60"
              style={{ animation: "floatDot 4s ease-in-out infinite 0.5s" }}
            />
            <div
              className="absolute top-0 left-1/3 w-1.5 h-1.5 rounded-full bg-green-400 opacity-50"
              style={{ animation: "floatDot 5s ease-in-out infinite 0.8s" }}
            />
            <div
              className="absolute top-1/3 left-2 w-1 h-1 rounded-full bg-gray-400 opacity-40"
              style={{ animation: "floatDot 3.5s ease-in-out infinite 1.3s" }}
            />
            <div
              className="absolute top-1/3 right-2 w-1 h-1 rounded-full bg-green-300 opacity-50"
              style={{ animation: "floatDot 3.8s ease-in-out infinite 0.3s" }}
            />
            <div
              className="absolute bottom-1/3 left-4 w-2 h-2 rounded-full bg-green-100 opacity-70"
              style={{ animation: "floatDot 4.5s ease-in-out infinite 1.7s" }}
            />
            <div
              className="absolute bottom-1/3 right-4 w-1.5 h-1.5 rounded-full bg-gray-300 opacity-50"
              style={{ animation: "floatDot 4.2s ease-in-out infinite 2.5s" }}
            />
            <div
              className="absolute top-6 left-1/2 w-1 h-1 rounded-full bg-green-500 opacity-40"
              style={{ animation: "floatDot 5.5s ease-in-out infinite 0.6s" }}
            />
            <div
              className="absolute bottom-8 right-1/3 w-1.5 h-1.5 rounded-full bg-gray-200 opacity-60"
              style={{ animation: "floatDot 3.6s ease-in-out infinite 1.9s" }}
            />
            <div
              className="absolute top-14 left-0 w-1 h-1 rounded-full bg-green-400 opacity-50"
              style={{ animation: "floatDot 4.8s ease-in-out infinite 2.2s" }}
            />
            <div
              className="absolute top-14 right-0 w-2 h-2 rounded-full bg-gray-100 opacity-70"
              style={{ animation: "floatDot 3.9s ease-in-out infinite 0.9s" }}
            />
          </div>
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-10px); }
            }
            @keyframes blink {
              0%, 90%, 100% { transform: scaleY(1); }
              95%            { transform: scaleY(0.1); }
            }
            @keyframes floatDot {
              0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
              33%       { transform: translateY(-10px) translateX(4px); opacity: 1; }
              66%       { transform: translateY(-4px) translateX(-4px); opacity: 0.8; }
            }
          `}</style>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-3">
            This page doesn&apos;t exist
          </h1>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-10 max-w-sm mx-auto">
            You might have followed a broken link, or the page was moved. Either
            way, there&apos;s nothing here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-7 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <Home size={15} />
              Go home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-7 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={15} />
              Go back
            </button>
          </div>
          <div className="border-t border-gray-100 pt-8">
            <p className="text-xs text-gray-400 mb-4 font-medium">
              Looking for one of these?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Find an event", href: "/find-vote" },
                { label: "Buy tickets", href: "/ticketing" },
                { label: "Login", href: "/login" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 hover:text-green-600 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-100 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 py-5 text-center">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Pawavotes. All rights reserved.
          Built for trust and transparency in Africa.
        </p>
      </div>
    </div>
  );
}
