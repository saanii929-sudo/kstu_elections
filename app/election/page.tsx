"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Vote, CheckCircle, Calendar, Clock, LogOut, ShieldCheck, ArrowRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";

// ─── countdown hook ────────────────────────────────────────────────────────────

function useCountdown(targetDate: string | null, onComplete?: () => void) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number;
  } | null>(null);
  const completedRef = useRef(false);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  useEffect(() => {
    if (!targetDate) { setTimeLeft(null); return; }
    completedRef.current = false;
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!completedRef.current) { completedRef.current = true; cbRef.current?.(); }
        return;
      }
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

// ─── countdown display ────────────────────────────────────────────────────────

function CountdownDisplay({
  countdown,
  label,
  pad,
}: {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  label: string;
  pad: (n: number) => string;
}) {
  const units = [
    { l: "Days",    v: countdown.days    },
    { l: "Hours",   v: countdown.hours   },
    { l: "Minutes", v: countdown.minutes },
    { l: "Seconds", v: countdown.seconds },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-start gap-3 sm:gap-4">
        {units.map(({ l, v }) => (
          <div key={l} className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-[#d4af37] bg-blue-200 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold text-green-500 tabular-nums">{pad(v)}</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="h-14 bg-white border-b border-slate-100" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="h-32 bg-white rounded-2xl border border-slate-100" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-xl border border-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── main content ─────────────────────────────────────────────────────────────

function ElectionHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");

  const [voterData, setVoterData] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const refreshVoterData = async (voterToken: string) => {
    setRefreshing(true);
    try {
      const res  = await fetch(`/api/elections/voter-status?token=${voterToken}`);
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("voterData", JSON.stringify(data.data));
        setVoterData(data.data);
      }
    } catch {}
    setRefreshing(false);
  };

  useEffect(() => {
    const storedToken = urlToken || localStorage.getItem("voterToken");
    const storedData  = localStorage.getItem("voterData");
    if (storedToken && storedData) {
      try { setVoterData(JSON.parse(storedData)); }
      catch { localStorage.removeItem("voterData"); }
    }
    setLoading(false);
  }, [urlToken]);

  useEffect(() => {
    if (!voterData || voterData.hasVoted) return;
    const voterToken = urlToken || localStorage.getItem("voterToken");
    if (!voterToken) return;
    const id = setInterval(() => refreshVoterData(voterToken), 45_000);
    return () => clearInterval(id);
  }, [voterData?.hasVoted, urlToken]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const election    = voterData?.election ?? null;
  const vIsActive   = election ? election.status === "active" : false;
  const vHasEnded   = election ? election.status === "ended" : false;
  const vIsUpcoming = election ? election.status === "upcoming" : false;

  const countdownTarget = election
    ? vIsUpcoming ? election.startDate : vIsActive ? election.endDate : null
    : null;

  const voterCountdown = useCountdown(
    voterData ? countdownTarget : null,
    () => {
      const storedToken = urlToken || localStorage.getItem("voterToken");
      if (storedToken) refreshVoterData(storedToken);
    }
  );

  if (loading) return <PageSkeleton />;

  if (!voterData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  const handleVoteNow = () => {
    if (voterData?.hasVoted)  { toast.error("You have already voted!");     return; }
    if (vIsUpcoming)           { toast.error("Voting has not started yet");  return; }
    if (vHasEnded)             { toast.error("Voting has ended");            return; }
    router.push(`/election/vote?token=${urlToken || localStorage.getItem("voterToken")}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("voterToken");
    localStorage.removeItem("voterData");
    localStorage.removeItem("voterTokenTimestamp");
    router.push("/election");
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontSize: "14px" } }} />

      <div className="min-h-screen bg-slate-50">

        {/* ── nav ──────────────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/images/logo.png" alt="KsTU E-Vote" width={32} height={32} />
              <span className="font-bold text-slate-800 text-sm hidden sm:block">KsTU E-Vote</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-600">
                    {voterData.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{voterData.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                <LogOut size={15} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">

          {/* ── page header card ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 px-6 sm:px-8 py-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status badge */}
                <div className="mb-3">
                  {voterData.hasVoted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Vote recorded
                    </span>
                  ) : vIsActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                      </span>
                      Voting is live
                    </span>
                  ) : vIsUpcoming ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> Voting starts soon
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      Voting closed
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-1">
                  {election.title}
                </h1>
                {election.description && (
                  <p className="text-sm text-slate-400 leading-relaxed mt-1 max-w-lg">
                    {election.description}
                  </p>
                )}

                {refreshing && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                    <div className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                    Checking election status…
                  </div>
                )}
              </div>

              {/* Vote CTA */}
              {vIsActive && !voterData.hasVoted && (
                <button
                  onClick={handleVoteNow}
                  className="inline-flex items-center gap-2 bg-[#d4af37] hover:bg-[#d4af37] text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors shrink-0"
                >
                  <Vote className="w-5 h-5" />
                  Cast your vote
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Voted notice */}
            {voterData.hasVoted && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Thank you for participating. Your vote has been securely recorded.
                </p>
              </div>
            )}
          </div>

          {/* ── countdown ────────────────────────────────────────────────── */}
          {voterCountdown && !vHasEnded && !voterData.hasVoted && (
            <CountdownDisplay
              countdown={voterCountdown}
              label={vIsActive ? "Voting closes in" : "Voting opens in"}
              pad={pad}
            />
          )}

          {/* ── info cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Voting period */}
            <div className="bg-white border border-slate-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Voting Period</h3>
              </div>
              <div className="space-y-3 divide-y divide-slate-50">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Opens</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(election.startDate).toLocaleString()}
                  </p>
                </div>
                <div className="pt-3">
                  <p className="text-xs text-slate-400 mb-0.5">Closes</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(election.endDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Voter status */}
            <div className="bg-white border border-slate-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Your Status</h3>
              </div>
              <div className="space-y-3 divide-y divide-slate-50">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Voter token</p>
                  <p className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg inline-block">
                    {voterData.token}
                  </p>
                </div>
                <div className="pt-3">
                  <p className="text-xs text-slate-400 mb-1">Vote status</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                    voterData.hasVoted ? "text-[#d4af37]" : "text-amber-600"
                  }`}>
                    {voterData.hasVoted
                      ? <><CheckCircle className="w-3.5 h-3.5" /> Voted</>
                      : <><Clock className="w-3.5 h-3.5" /> Not yet voted</>
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-white border border-slate-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Vote className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">Guidelines</h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  "You can only vote once",
                  "Your vote is confidential",
                  "Vote only during the active period",
                  "Credentials expire after the election",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── how to vote (active, not voted) ──────────────────────────── */}
          {!voterData.hasVoted && vIsActive && (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              {/* header row — always visible */}
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-sm font-bold text-slate-800">How to cast your vote</h3>
                <button
                  onClick={() => setGuideOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#d4af37] hover:text-green-700 transition-colors"
                >
                  {guideOpen ? "Hide guide" : "View guide"}
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-300"
                    style={{ transform: guideOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
              </div>

              {/* collapsible body */}
              <div
                className="transition-all duration-300 ease-in-out overflow-hidden"
                style={{ maxHeight: guideOpen ? "500px" : "0px", opacity: guideOpen ? 1 : 0 }}
              >
                <div className="px-6 pb-6 border-t border-slate-100 pt-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    {[
                      { step: 1, title: 'Click "Cast your vote"', desc: "Use the button at the top of this page" },
                      { step: 2, title: "Review candidates",      desc: "Browse all positions and nominees"      },
                      { step: 3, title: "Make your selections",   desc: "Choose one candidate per position"      },
                      { step: 4, title: "Submit your vote",       desc: "Confirm and finalise your choices"      },
                    ].map(({ step, title, desc }) => (
                      <div key={step} className="flex flex-col gap-3">
                        <div className="w-7 h-7 bg-[#d4af37] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {step}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{title}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100 flex justify-start">
                    <button
                      onClick={handleVoteNow}
                      className="inline-flex items-center gap-2 bg-[#d4af37] hover:bg-green-700 text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-sm"
                    >
                      <Vote className="w-5 h-5" />
                      Cast your vote now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── voted confirmation ───────────────────────────────────────── */}
          {voterData.hasVoted && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">Vote submitted successfully</h3>
                <p className="text-sm text-slate-400">
                  Your vote has been securely recorded. Thank you for participating in this election.
                </p>
              </div>
            </div>
          )}

          {/* ── election ended, not voted ─────────────────────────────────── */}
          {vHasEnded && !voterData.hasVoted && (
            <div className="bg-white border border-slate-100 rounded-xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">Voting period has ended</h3>
                <p className="text-sm text-slate-400">
                  This election has closed. You are no longer able to cast a vote.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 py-5 text-center mt-4">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-[#d4af37]">Kumasi Technical University</span> · Secure, transparent elections
          </p>
        </footer>
      </div>
    </>
  );
}

// ─── page wrapper ─────────────────────────────────────────────────────────────

export default function ElectionHomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ElectionHomeContent />
    </Suspense>
  );
}
