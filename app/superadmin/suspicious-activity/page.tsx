"use client";

import { useEffect, useState } from "react";
import { Search, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

interface SuspiciousCluster {
  electionId?: string;
  electionTitle?: string;
  ip: string;
  distinctVoterCount: number;
  distinctStudentIds: (string | null)[];
  totalAttempts: number;
  failedAttempts: number;
  firstSeen: string;
  lastSeen: string;
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SuspiciousActivityPage() {
  const [clusters, setClusters] = useState<SuspiciousCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [windowMs, setWindowMs] = useState(5 * 60 * 1000);
  const [voterThreshold, setVoterThreshold] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchClusters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const fetchClusters = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "25");
      const res = await fetch(`/api/superadmin/suspicious-activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClusters(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.meta?.windowMs) setWindowMs(data.meta.windowMs);
        if (data.meta?.voterThreshold) setVoterThreshold(data.meta.voterThreshold);
      }
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  const windowMinutes = Math.round(windowMs / 60000);

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-7 w-52 bg-gray-100 rounded-lg" />
        <div className="h-11 bg-gray-100 rounded-xl" />
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 border-b border-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Suspicious Activity</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {total} IP cluster{total !== 1 ? "s" : ""} with {voterThreshold}+ distinct voters within {windowMinutes} minutes — review only, nothing here is auto-blocked.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Search by IP address or election title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
        />
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["IP Address", "Election", "Distinct Voters", "Attempts", "First Seen", "Last Seen"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clusters.length > 0 ? (
                clusters.map((c, i) => (
                  <tr key={`${c.ip}-${c.electionId ?? i}`} className="hover:bg-gray-50/60 transition-colors align-top">
                    <td className="py-3 px-4 text-sm font-mono text-gray-800 whitespace-nowrap">{c.ip}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{c.electionTitle || "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700">
                        {c.distinctVoterCount} voters
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {c.totalAttempts} total
                      {c.failedAttempts > 0 && (
                        <span className="text-red-500"> · {c.failedAttempts} failed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(c.firstSeen)}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(c.lastSeen)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <ShieldAlert className="mx-auto mb-2 text-gray-300" size={32} />
                    <p className="text-sm text-gray-400">No suspicious activity flagged right now</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
