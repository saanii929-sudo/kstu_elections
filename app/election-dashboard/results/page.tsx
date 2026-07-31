"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Users,
  Award,
  BarChart3,
  Grid3x3,
  Table2,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { getElectionStatus } from "@/lib/electionStatus";

// Dynamic color palette for candidate differentiation
const CANDIDATE_COLORS = [
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#111827", // black
  "#9333ea", // purple
  "#db2777", // pink
  "#0891b2", // cyan
  "#d97706", // amber
  "#0d9488", // teal
];

interface Candidate {
  _id: string;
  name: string;
  image?: string;
  voteCount: number;
  // Only meaningful when this candidate is the sole one in their category —
  // explicit rejections on the YES/NO referendum ballot.
  noVoteCount?: number;
  categoryId: { _id: string; name: string };
}

interface Voter {
  _id: string;
  hasVoted: boolean;
}

interface Election {
  _id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
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

function PieChart({
  candidates,
  colors,
}: {
  candidates: { name: string; voteCount: number }[];
  colors: string[];
}) {
  const total = candidates.reduce((s, c) => s + c.voteCount, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-44 h-44 rounded-full border-2 border-dashed border-gray-200">
        <span className="text-xs text-gray-400 text-center px-4">
          No votes yet
        </span>
      </div>
    );
  }

  let angle = -90;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  const slices = candidates.map((c, i) => {
    const sweep = (c.voteCount / total) * 360;
    const start = angle;
    angle += sweep;
    return { ...c, start, end: angle, color: colors[i % colors.length] };
  });

  function polar(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(
    cx: number,
    cy: number,
    r: number,
    s: number,
    e: number,
    large: boolean,
  ) {
    const a = polar(cx, cy, r, s);
    const b = polar(cx, cy, r, e);
    return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large ? 1 : 0} 1 ${b.x} ${b.y} Z`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => (
        <path
          key={i}
          d={arc(
            cx,
            cy,
            r,
            slice.start,
            slice.end,
            slice.end - slice.start > 180,
          )}
          fill={slice.color}
          stroke="white"
          strokeWidth="2.5"
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.4} fill="white" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="text-blue-600" size={26} />
        </div>
      </div>
      <p className="text-3xl font-bold text-blue-600">{value}</p>
      <p className="text-lg text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-sm font-semibold text-blue-600 mt-1">{sub}</p>}
    </div>
  );
}

// Returns tie info for a sorted (descending) candidate list
function getTieStatus(candidates: { voteCount: number }[]) {
  if (candidates.length === 0)
    return { maxVotes: 0, isTied: false, tiedCount: 0 };
  const maxVotes = candidates[0].voteCount;
  if (maxVotes === 0) return { maxVotes: 0, isTied: false, tiedCount: 0 };
  const tiedCount = candidates.filter((c) => c.voteCount === maxVotes).length;
  return { maxVotes, isTied: tiedCount > 1, tiedCount };
}

export default function ResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const currentElection =
    elections.find((e) => e._id === selectedElection) || null;
  // Purely date-driven, same rule voting eligibility and the rest of the
  // dashboard already use (see lib/electionStatus.ts) — status labels here
  // never disagree with what voters can actually do.
  const electionStatusKey = currentElection
    ? getElectionStatus(currentElection)
    : null;
  const electionEnded = electionStatusKey === "closed";
  const electionActive = electionStatusKey === "live";
  const electionUpcoming = electionStatusKey === "scheduled";

  const countdownTarget = currentElection ? currentElection.endDate : null;
  const countdown = useCountdown(countdownTarget);
  const pad = (n: number) => String(n).padStart(2, "0");

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchResults(true);
      fetchVoters();
    }
  }, [selectedElection]);

  useEffect(() => {
    if (!selectedElection || !autoRefresh) return;
    const id = setInterval(() => {
      fetchResults(false);
      fetchVoters();
    }, 5000);
    return () => clearInterval(id);
  }, [selectedElection, autoRefresh]);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/elections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setElections(data.data || []);
        if (data.data.length > 0) setSelectedElection(data.data[0]._id);
      }
    } catch {}
  };

  const fetchResults = async (initial = false) => {
    if (!selectedElection) return;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/elections/candidates?electionId=${selectedElection}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.data || []);
        setLastUpdated(new Date());
      }
    } catch {
      if (initial) toast.error("Failed to load results");
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  };

  const fetchVoters = async () => {
    if (!selectedElection) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/elections/voters?electionId=${selectedElection}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setVoters(data.data || []);
      }
    } catch {}
  };

  const groupedCandidates = candidates.reduce(
    (acc, c) => {
      const pos = c.categoryId?.name || "Unknown";
      if (!acc[pos]) acc[pos] = [];
      acc[pos].push(c);
      return acc;
    },
    {} as Record<string, Candidate[]>,
  );

  Object.keys(groupedCandidates).forEach((pos) => {
    groupedCandidates[pos].sort((a, b) => b.voteCount - a.voteCount);
  });

  const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0);
  const totalVoters = voters.length;
  const votedCount = voters.filter((v) => v.hasVoted).length;
  const turnoutRate =
    totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  const downloadResults = () => {
    const rows = [
      "Position,Rank,Candidate,Votes,Percentage,Status",
      ...Object.entries(groupedCandidates).flatMap(([pos, cs]) => {
        // Solo (referendum-style) position — export real Yes/No counts
        // rather than treating the sole candidate as an uncontested race.
        if (cs.length === 1) {
          const solo = cs[0];
          const yesCount = solo.voteCount;
          const noCount = solo.noVoteCount || 0;
          const decidedTotal = yesCount + noCount;
          const yesPct =
            decidedTotal > 0
              ? ((yesCount / decidedTotal) * 100).toFixed(2)
              : "0.00";
          const noPct =
            decidedTotal > 0
              ? ((noCount / decidedTotal) * 100).toFixed(2)
              : "0.00";
          const isSoloTied = decidedTotal > 0 && yesCount === noCount;
          const yesStatus = isSoloTied
            ? "Tied"
            : electionEnded
              ? yesCount > noCount
                ? "Elected"
                : "Not Elected"
              : "Leading";
          const noStatus = isSoloTied
            ? "Tied"
            : electionEnded && noCount > yesCount
              ? "Rejected"
              : "—";
          return [
            `"${pos}",1,"Yes — ${solo.name}",${yesCount},${yesPct}%,${yesStatus}`,
            `"${pos}",2,"No — ${solo.name}",${noCount},${noPct}%,${noStatus}`,
          ];
        }

        const t = cs.reduce((s, c) => s + c.voteCount, 0);
        const { maxVotes, isTied } = getTieStatus(cs);
        return cs.map((c, i) => {
          const pct = t > 0 ? ((c.voteCount / t) * 100).toFixed(2) : "0.00";
          const isTop = c.voteCount === maxVotes && maxVotes > 0;
          let status: string;
          if (isTop && isTied) status = "Tied";
          else if (isTop && electionEnded) status = "Elected";
          else if (isTop) status = "Leading";
          else status = "Trailing";
          return `"${pos}",${i + 1},"${c.name}",${c.voteCount},${pct}%,${status}`;
        });
      }),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `election-results-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Results downloaded!");
  };

  return (
    <div className="max-w-7xl">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-[#d4af37] text-white text-sm font-bold px-3 py-1 rounded-full">
              <span className="w-4 h-4 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            {autoRefresh && (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#d4af37] font-medium">
                <span className="w-3 h-3 bg-[#d4af37] rounded-full animate-pulse" />
                Auto-updating
              </span>
            )}
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <RefreshCw size={11} className="animate-spin" />
                Refreshing…
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Live Election Results
          </h1>
          <p className="text-lg text-gray-400 mt-0.5">
            Last updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-lg font-medium transition ${viewMode === "grid" ? "bg-white text-[#d4af37] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Grid3x3 size={18} /> Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-lg font-medium transition ${viewMode === "table" ? "bg-white text-[#d4af37] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Table2 size={18} /> Table
            </button>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-lg font-medium border transition ${autoRefresh ? "border-green-200 bg-green-50 text-[#d4af37]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <RefreshCw
              size={16}
              className={autoRefresh && refreshing ? "animate-spin" : ""}
            />
            {autoRefresh ? "Auto On" : "Auto Off"}
          </button>

          <button
            onClick={() => {
              fetchResults(false);
              fetchVoters();
              toast.success("Refreshed");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-lg font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            onClick={downloadResults}
            disabled={candidates.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-lg font-medium bg-[#d4af37] text-white hover:bg-[#d4af37] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Election Selector */}
      <div className="flex flex-col md:flex-row md:items-start items-start gap-4 justify-between">
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-1.5">
            Election
          </label>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="w-full md:w-80 px-4 py-2.5 border border-gray-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white"
          >
            {elections.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        {/* Election status */}
        {electionStatusKey && (
          <div
            className={`flex items-center gap-2 mb-3 text-3xl uppercase font-stretch-ultra-expanded font-bold ${
              electionStatusKey === "closed"
                ? "text-red-600"
                : electionStatusKey === "live"
                  ? "text-blue-600"
                  : "text-[#d4af37]"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 text-center rounded-full ${
                electionStatusKey === "closed"
                  ? "bg-red-500"
                  : electionStatusKey === "live"
                    ? "bg-blue-500 animate-pulse"
                    : "bg-[#d4af37]"
              }`}
            />
            {electionStatusKey === "closed"
              ? "Ended"
              : electionStatusKey === "live"
                ? "Ongoing"
                : "Not Started"}
          </div>
        )}
      </div>

      {selectedElection && currentElection && (
        <>
          {/* Countdown Banner */}
          {countdown && !electionEnded && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-lg text-gray-900">
                  {electionActive ? "Voting closes in" : "Voting opens in"}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {electionActive
                    ? `Ends ${new Date(currentElection.endDate).toLocaleString()}`
                    : `Starts ${new Date(currentElection.startDate).toLocaleString()}`}
                </p>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hours", value: countdown.hours },
                  { label: "Minutes", value: countdown.minutes },
                  { label: "Seconds", value: countdown.seconds },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-[#d4af37] bg-blue-200 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-[#d4af37] tabular-nums">
                        {pad(value)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Election ended notice */}
          {electionEnded && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-14 h-14 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="text-[#d4af37]" size={22} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  Election concluded
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Final results · ended{" "}
                  {new Date(currentElection.endDate).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Votes Cast"
              value={totalVotes}
              icon={BarChart3}
            />
            <StatCard
              label="Yet to Vote"
              value={totalVoters - votedCount}
              icon={Clock}
            />
            <StatCard
              label="Registered Voters"
              value={totalVoters}
              icon={Users}
            />
            <StatCard
              label="Turnout Rate"
              value={`${turnoutRate}%`}
              icon={Award}
              sub={
                totalVoters > 0
                  ? `${votedCount} of ${totalVoters} voted`
                  : undefined
              }
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">
              Results by Position
            </h2>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-lg text-gray-400 whitespace-nowrap">
              {Object.keys(groupedCandidates).length} position
              {Object.keys(groupedCandidates).length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Results Content */}
          {loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
              <div className="w-14 h-14 border-2 border-gray-200 border-t-[#d4af37] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-lg text-gray-500">Loading results…</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-[#d4af37]" size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No results yet</h3>
              <p className="text-lg text-gray-500">
                Results will appear once voting begins
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-6">
              {Object.entries(groupedCandidates).map(
                ([positionName, positionCandidates]) => {
                  const posTotal = positionCandidates.reduce(
                    (s, c) => s + c.voteCount,
                    0,
                  );
                  const { maxVotes, isTied, tiedCount } =
                    getTieStatus(positionCandidates);

                  // ── Solo candidate: referendum-style Yes/No breakdown ────────
                  if (positionCandidates.length === 1) {
                    const solo = positionCandidates[0];
                    const yesCount = solo.voteCount;
                    const noCount = solo.noVoteCount || 0;
                    const decidedTotal = yesCount + noCount;
                    const yesPct =
                      decidedTotal > 0 ? (yesCount / decidedTotal) * 100 : 0;
                    const noPct =
                      decidedTotal > 0 ? (noCount / decidedTotal) * 100 : 0;
                    const isSoloTied = decidedTotal > 0 && yesCount === noCount;
                    return (
                      <div
                        key={positionName}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-black">
                              {positionName}
                            </h3>
                          </div>
                          <span className="text-lg bg-white/15 text-white px-3 py-1 rounded-full">
                            {totalVoters.toLocaleString()} registered voter
                            {totalVoters !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="p-6">
                          {/* Candidate identity */}
                          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                            {solo.image ? (
                              <img
                                src={solo.image}
                                alt={solo.name}
                                className="w-44 h-44 rounded-lg object-cover border-2 border-green-100 shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="w-44 h-44 rounded-full bg-green-50 flex items-center justify-center border-2 border-green-100 shrink-0">
                                <User className="text-[#d4af37]" size={28} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-2xl text-gray-900 truncate">
                                {solo.name}
                              </p>
                              <p className="text-lg text-gray-500 mt-0.5">
                                Running for{" "}
                                <span className="font-semibold text-gray-700">
                                  {positionName}
                                </span>
                              </p>
                              <div className="mt-1.5">
                                {isSoloTied ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-lg font-bold bg-amber-100 text-amber-700">
                                    <Award size={14} /> Tied
                                  </span>
                                ) : electionEnded ? (
                                  decidedTotal === 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-gray-200 text-gray-600">
                                      No Votes Cast
                                    </span>
                                  ) : yesCount > noCount ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-lg font-bold bg-[#d4af37] text-white">
                                      <Award size={14} /> Elected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-lg font-bold bg-red-100 text-red-700">
                                      <XCircle size={14} /> Rejected
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-lg font-bold bg-blue-100 text-blue-700">
                                    <CheckCircle size={14} /> Polling in
                                    Progress
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-5xl font-extrabold text-gray-900">
                                {decidedTotal.toLocaleString()}
                              </p>
                              <p className="text-lg text-gray-400 mt-0.5">
                                votes cast
                              </p>
                            </div>
                          </div>
                          {/* Split bar */}
                          <div className="flex items-center justify-between text-lg font-bold mb-2">
                            <span className="text-[#d4af37] text-xl">
                              Yes — {yesPct.toFixed(1)}%
                            </span>
                            <span className="text-red-500 text-xl">
                              No — {noPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex h-12 w-xl rounded-2xl overflow-hidden mb-2 bg-gray-100">
                            <div
                              className="bg-[#d4af37] flex items-center justify-center transition-all duration-700"
                              style={{
                                width: `${yesPct}%`,
                                minWidth: yesPct > 0 ? "2px" : "0",
                              }}
                            >
                              {yesPct >= 14 && (
                                <span className="text-white text-lg font-bold">
                                  {yesPct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <div
                              className="bg-red-400 flex items-center justify-center transition-all duration-700"
                              style={{
                                width: `${noPct}%`,
                                minWidth: noPct > 0 ? "2px" : "0",
                              }}
                            >
                              {noPct >= 14 && (
                                <span className="text-white text-lg font-bold">
                                  {noPct.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 mb-5">
                            {decidedTotal.toLocaleString()} of{" "}
                            {totalVoters.toLocaleString()} registered voter
                            {totalVoters !== 1 ? "s" : ""} decided on this
                            position
                          </p>
                          {/* Stat cards */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl p-4 bg-green-50 border border-green-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-[#d4af37] shrink-0" />
                                <p className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">
                                  Yes
                                </p>
                              </div>
                              <p className="text-4xl font-extrabold text-gray-900 leading-none">
                                {yesCount.toLocaleString()}
                              </p>
                              <p className="text-xl text-green-600 font-semibold mt-1">
                                {yesPct.toFixed(1)}% of votes cast
                              </p>
                            </div>
                            <div className="rounded-xl p-4 bg-red-50 border border-red-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-red-400 shrink-0" />
                                <p className="text-lg font-bold text-red-600 uppercase tracking-wider">
                                  No
                                </p>
                              </div>
                              <p className="text-4xl font-extrabold text-gray-900 leading-none">
                                {noCount.toLocaleString()}
                              </p>
                              <p className="text-xl text-red-500 font-semibold mt-1">
                                {noPct.toFixed(1)}% of votes cast
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={positionName}
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Position header */}
                      <div className="px-6 py-4 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-black">
                          {positionName}
                        </h3>
                        <span className="text-lg bg-white/15 text-black px-3 py-1 rounded-full font-medium">
                          {posTotal.toLocaleString()} vote
                          {posTotal !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="p-6 flex flex-col lg:flex-row gap-6">
                        {/* Candidate list */}
                        <div className="flex-1 space-y-3">
                          {positionCandidates.map((candidate, i) => {
                            const pct =
                              posTotal > 0
                                ? (
                                    (candidate.voteCount / posTotal) *
                                    100
                                  ).toFixed(1)
                                : "0.0";
                            const color =
                              CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
                            const isTop =
                              candidate.voteCount === maxVotes && maxVotes > 0;
                            const isTiedCandidate = isTied && isTop;
                            const isWinner = !isTied && isTop;

                            return (
                              <div
                                key={candidate._id}
                                className={`flex items-center gap-4 p-4 rounded-lg border transition-all
                                ${
                                  isTiedCandidate
                                    ? "border-amber-200 bg-amber-50/50"
                                    : isWinner
                                      ? "border-green-200 bg-green-50"
                                      : "border-gray-100 bg-gray-50/50"
                                }`}
                              >
                                {/* Rank */}
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                                  style={{ backgroundColor: color }}
                                >
                                  {i + 1}
                                </div>

                                {/* Photo */}
                                {candidate.image ? (
                                  <img
                                    src={candidate.image}
                                    alt={candidate.name}
                                    className="w-44 h-44 rounded-lg object-cover border-2 border-white shadow-sm shrink-0"
                                  />
                                ) : (
                                  <div className="w-44 h-44 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                                    <User className="text-gray-400" size={58} />
                                  </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-4">
                                    <p className="font-bold text-gray-900 text-xl truncate">
                                      {candidate.name}
                                    </p>
                                    {isTiedCandidate && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-lg font-bold shrink-0 bg-amber-100 text-amber-800">
                                        <AlertTriangle size={24} />
                                        Tied
                                      </span>
                                    )}
                                    {isWinner && (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-lg font-bold shrink-0 ${electionEnded ? "bg-[#d4af37] text-white" : "bg-green-100 text-[#d4af37]"}`}
                                      >
                                        <Award size={14} />
                                        {electionEnded ? "Elected" : "Leading"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="relative group/bar">
                                    <div className="w-sm bg-gray-200 rounded-full h-10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: color,
                                        }}
                                      />
                                    </div>
                                    <span className="absolute -top-6 right-0 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-700 text-white text-xl font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                                      {pct}%
                                    </span>
                                  </div>
                                </div>

                                {/* Vote count */}
                                <div className="text-right shrink-0">
                                  <p className="text-3xl font-bold text-gray-900">
                                    {candidate.voteCount.toLocaleString()}
                                  </p>
                                  <p className="text-xl font-semibold text-gray-400">
                                    {pct}%
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col items-center gap-4 lg:w-72 shrink-0">
                          <PieChart
                            candidates={positionCandidates}
                            colors={CANDIDATE_COLORS}
                          />
                          <div className="w-full space-y-1.5">
                            {positionCandidates.map((c, i) => (
                              <div
                                key={c._id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{
                                    backgroundColor:
                                      CANDIDATE_COLORS[
                                        i % CANDIDATE_COLORS.length
                                      ],
                                  }}
                                />
                                <span className="text-gray-600 truncate">
                                  {c.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            /* Table View */
            <div className="space-y-6">
              {Object.entries(groupedCandidates).map(
                ([positionName, positionCandidates]) => {
                  const posTotal = positionCandidates.reduce(
                    (s, c) => s + c.voteCount,
                    0,
                  );
                  const { maxVotes, isTied, tiedCount } =
                    getTieStatus(positionCandidates);

                  // ── Solo candidate: referendum-style Yes/No breakdown ────────
                  if (positionCandidates.length === 1) {
                    const solo = positionCandidates[0];
                    const yesCount = solo.voteCount;
                    const noCount = solo.noVoteCount || 0;
                    const decidedTotal = yesCount + noCount;
                    const yesPct =
                      decidedTotal > 0 ? (yesCount / decidedTotal) * 100 : 0;
                    const noPct =
                      decidedTotal > 0 ? (noCount / decidedTotal) * 100 : 0;
                    const isSoloTied = decidedTotal > 0 && yesCount === noCount;
                    return (
                      <div
                        key={positionName}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-black">
                              {positionName}
                            </h3>
                          </div>
                          <span className="text-lg bg-white/15 text-white px-3 py-1 rounded-full">
                            {totalVoters.toLocaleString()} registered voter
                            {totalVoters !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-lg">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                  Candidate
                                </th>
                                <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                  Count
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide w-56">
                                  Share of Votes Cast
                                </th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Yes row */}
                              <tr
                                className={`border-b border-gray-100 ${isSoloTied ? "bg-amber-50" : "bg-green-50"}`}
                              >
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    {solo.image ? (
                                      <img
                                        src={solo.image}
                                        alt={solo.name}
                                        className="w-22 h-22 rounded-lg object-cover border-2 border-green-100 shadow-sm shrink-0"
                                      />
                                    ) : (
                                      <div className="w-22 h-22 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                        <User
                                          className="text-green-600"
                                          size={22}
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-bold text-xl text-gray-900">
                                        Yes — {solo.name}
                                      </p>
                                      <p className="text-sm text-gray-400 mt-0.5">
                                        Voted for this candidate
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <p className="text-xl font-bold text-gray-900">
                                    {yesCount.toLocaleString()}
                                  </p>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-[#d4af37] transition-all duration-700"
                                        style={{ width: `${yesPct}%` }}
                                      />
                                    </div>
                                    <span className="text-lg font-semibold text-[#d4af37] w-12 text-right">
                                      {yesPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6"></td>
                              </tr>
                              {/* No row */}
                              <tr className="hover:bg-gray-50/60">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-22 h-22 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                      <XCircle
                                        className="text-red-400"
                                        size={22}
                                      />
                                    </div>
                                    <div>
                                      <p className="font-bold text-xl text-gray-900">
                                        No — {solo.name}
                                      </p>
                                      <p className="text-sm text-gray-400 mt-0.5">
                                        Voted against this candidate
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <p className="text-xl font-bold text-gray-900">
                                    {noCount.toLocaleString()}
                                  </p>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-red-400 transition-all duration-700"
                                        style={{ width: `${noPct}%` }}
                                      />
                                    </div>
                                    <span className="text-lg font-bold text-red-500 w-12 text-right">
                                      {noPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  {!isSoloTied &&
                                  electionEnded &&
                                  decidedTotal > 0 &&
                                  noCount > yesCount ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-lg font-bold bg-red-100 text-red-700">
                                      <XCircle size={22} /> Rejected
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-lg font-medium bg-gray-100 text-gray-500">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="px-6 pb-4 text-sm text-gray-400">
                          {decidedTotal.toLocaleString()} of{" "}
                          {totalVoters.toLocaleString()} registered voter
                          {totalVoters !== 1 ? "s" : ""} decided on this
                          position
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={positionName}
                      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="px-6 py-4 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-black">
                          {positionName}
                        </h3>
                        <span className="text-sm bg-white/15 text-black px-3 py-1 rounded-full font-medium">
                          {posTotal.toLocaleString()} vote
                          {posTotal !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Mobile cards */}
                      <div className="block md:hidden divide-y divide-gray-50">
                        {positionCandidates.map((candidate, i) => {
                          const pct =
                            posTotal > 0
                              ? (
                                  (candidate.voteCount / posTotal) *
                                  100
                                ).toFixed(1)
                              : "0.0";
                          const color =
                            CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
                          const isTop =
                            candidate.voteCount === maxVotes && maxVotes > 0;
                          const isTiedCandidate = isTied && isTop;
                          const isWinner = !isTied && isTop;

                          return (
                            <div
                              key={candidate._id}
                              className={`p-4 ${isTiedCandidate ? "bg-amber-50/40" : isWinner ? "bg-green-50" : ""}`}
                            >
                              <div className="flex items-center gap-3 mb-2.5">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                  style={{ backgroundColor: color }}
                                >
                                  {i + 1}
                                </div>
                                {candidate.image ? (
                                  <img
                                    src={candidate.image}
                                    alt={candidate.name}
                                    className="w-22 h-22 rounded-lg object-cover border-2 border-white shadow-sm shrink-0"
                                  />
                                ) : (
                                  <div className="w-22 h-22 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    <User className="text-gray-400" size={22} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-lg text-gray-900 truncate">
                                    {candidate.name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {candidate.voteCount.toLocaleString()} votes
                                    · {pct}%
                                  </p>
                                </div>
                                {isTiedCandidate ? (
                                  <span className="text-lg font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                                    Tied
                                  </span>
                                ) : isWinner ? (
                                  <span
                                    className={`text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${electionEnded ? "bg-[#d4af37] text-white" : "bg-green-100 text-[#d4af37]"}`}
                                  >
                                    {electionEnded ? "Elected" : "Leading"}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 shrink-0">
                                    #{i + 1}
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden ml-9">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Rank
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Candidate
                              </th>
                              <th className="text-right py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Votes
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide w-48">
                                Share
                              </th>
                              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {positionCandidates.map((candidate, i) => {
                              const pct =
                                posTotal > 0
                                  ? (
                                      (candidate.voteCount / posTotal) *
                                      100
                                    ).toFixed(1)
                                  : "0.0";
                              const color =
                                CANDIDATE_COLORS[i % CANDIDATE_COLORS.length];
                              const isTop =
                                candidate.voteCount === maxVotes &&
                                maxVotes > 0;
                              const isTiedCandidate = isTied && isTop;
                              const isWinner = !isTied && isTop;

                              return (
                                <tr
                                  key={candidate._id}
                                  className={`transition-colors
                                ${
                                  isTiedCandidate
                                    ? "bg-amber-50/40 hover:bg-amber-50"
                                    : isWinner
                                      ? "bg-green-50 hover:bg-green-100/60"
                                      : "hover:bg-gray-50/60"
                                }`}
                                >
                                  <td className="py-4 px-6">
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                                      style={{ backgroundColor: color }}
                                    >
                                      {i + 1}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      {candidate.image ? (
                                        <img
                                          src={candidate.image}
                                          alt={candidate.name}
                                          className="w-22 h-22 rounded-lg object-cover border-2 border-white shadow-sm shrink-0"
                                        />
                                      ) : (
                                        <div className="w-22 h-22 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                          <User
                                            className="text-gray-400"
                                            size={16}
                                          />
                                        </div>
                                      )}
                                      <p className="font-semibold text-lg text-gray-900">
                                        {candidate.name}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <p className="text-xl font-bold text-gray-900">
                                      {candidate.voteCount.toLocaleString()}
                                    </p>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all duration-700"
                                          style={{
                                            width: `${pct}%`,
                                            backgroundColor: color,
                                          }}
                                        />
                                      </div>
                                      <span className="text-lg font-semibold text-gray-600 w-10 text-right">
                                        {pct}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    {isTiedCandidate ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800">
                                        <AlertTriangle size={11} />
                                        Tied
                                      </span>
                                    ) : isWinner ? (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${electionEnded ? "bg-[#d4af37] text-white" : "bg-green-100 text-[#d4af37]"}`}
                                      >
                                        <Award size={11} />
                                        {electionEnded ? "Elected" : "Leading"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                                        Trailing
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
