"use client";

import { useEffect, useState, type ElementType } from "react";
import {
  Eye, Users, TrendingUp, Clock,
  Monitor, Smartphone, Tablet, Globe, ArrowUpRight,
} from "lucide-react";

/* ─── types ───────────────────────────────────────────────── */

interface Analytics {
  overview: {
    totalViews: number;
    uniqueSessions: number;
    todayViews: number;
    todaySessions: number;
  };
  topPages:        Array<{ _id: string; views: number; uniqueVisitors: number }>;
  deviceBreakdown: Array<{ _id: string; count: number }>;
  browserBreakdown:Array<{ _id: string; count: number }>;
  viewsByDay:      Array<{ _id: string; views: number; uniqueVisitors: number }>;
  topReferrers:    Array<{ _id: string; count: number }>;
  recentViews:     Array<{ path: string; device: string; browser: string; createdAt: string }>;
}

/* ─── helpers ─────────────────────────────────────────────── */

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function deviceIcon(d: string) {
  if (d === "mobile")  return <Smartphone size={14} className="text-blue-500 shrink-0" />;
  if (d === "tablet")  return <Tablet     size={14} className="text-violet-500 shrink-0" />;
  return                      <Monitor    size={14} className="text-gray-400 shrink-0" />;
}

const RANGES: { id: string; label: string }[] = [
  { id: "24h", label: "24h"     },
  { id: "7d",  label: "7 days"  },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-32 bg-gray-100 rounded-lg" />
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-64 bg-gray-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-52 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 bg-gray-100 rounded-2xl" />
        <div className="space-y-5">
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-28 bg-gray-100 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-52 bg-gray-100 rounded-2xl" />
        <div className="h-52 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

/* ─── stat card ───────────────────────────────────────────── */

function StatCard({
  label, value, sub, icon: Icon, numColor, iconCls,
}: {
  label: string; value: string | number; sub: string;
  icon: ElementType; numColor: string; iconCls: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 hover:ring-gray-200 transition-all">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconCls}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <p className={`text-3xl sm:text-4xl font-bold leading-none tabular-nums ${numColor}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs font-semibold text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── section header ──────────────────────────────────────── */

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-5 py-4 border-b border-gray-50">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function SiteAnalyticsPage() {
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]   = useState("7d");

  useEffect(() => { fetchAnalytics(); }, [range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData((await res.json()).data);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-20 text-center text-sm text-gray-400">
        No analytics data yet — appears as visitors browse the platform.
      </div>
    );
  }

  const maxDayViews = data.viewsByDay.length
    ? Math.max(...data.viewsByDay.map((d) => d.views), 1)
    : 1;

  const deviceTotal  = data.deviceBreakdown.reduce((s, d) => s + d.count, 0);
  const browserTotal = data.browserBreakdown.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-5">

      {/* ── Header + range tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visitor activity across the platform</p>
        </div>
        <div className="flex items-center gap-1 bg-white ring-1 ring-gray-200 rounded-xl px-1.5 py-1.5 self-start">
          {RANGES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setRange(id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                range === id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Page Views"
          value={data.overview.totalViews}
          sub="In selected range"
          icon={Eye}
          numColor="text-gray-900"
          iconCls="bg-gray-50 text-gray-500"
        />
        <StatCard
          label="Unique Visitors"
          value={data.overview.uniqueSessions}
          sub="Distinct sessions"
          icon={Users}
          numColor="text-blue-700"
          iconCls="bg-blue-50 text-blue-500"
        />
        <StatCard
          label="Views Today"
          value={data.overview.todayViews}
          sub="Since midnight"
          icon={TrendingUp}
          numColor="text-[#D4AF37]"
          iconCls="bg-[#1C2338] text-[#D4AF37]"
        />
        <StatCard
          label="Visitors Today"
          value={data.overview.todaySessions}
          sub="Unique today"
          icon={Users}
          numColor="text-gray-900"
          iconCls="bg-violet-50 text-violet-500"
        />
      </div>

      {/* ── Daily views bar chart ── */}
      {data.viewsByDay.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <SectionHead title="Daily views" sub="Views and unique visitors per day" />
          <div className="px-5 py-4 space-y-2.5">
            {data.viewsByDay.map((day) => {
              const pct = Math.max((day.views / maxDayViews) * 100, 3);
              return (
                <div key={day._id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-14 shrink-0 tabular-nums">{fmtDay(day._id)}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] rounded transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 w-24 justify-end tabular-nums">
                    <span className="text-xs font-semibold text-gray-900">{day.views}</span>
                    <span className="text-[11px] text-gray-400">/ {day.uniqueVisitors}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="px-5 pb-4 text-[11px] text-gray-400">views · unique visitors</p>
        </div>
      )}

      {/* ── Top pages + devices/browsers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top pages */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <SectionHead title="Top pages" sub="Most visited routes in range" />
          {data.topPages.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.topPages.map((page, i) => (
                <div key={page._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-gray-300 w-5 shrink-0 tabular-nums">{i + 1}</span>
                  <span className="text-sm text-gray-700 truncate flex-1 font-medium">{page._id}</span>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-[11px] text-gray-400">{page.uniqueVisitors} visitors</span>
                    <span className="text-sm font-bold text-gray-900">{page.views}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices + browsers stacked */}
        <div className="space-y-5">

          {/* Devices */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
            <SectionHead title="Devices" sub="Breakdown by device type" />
            {data.deviceBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {data.deviceBreakdown.map((d) => {
                  const pct = deviceTotal > 0 ? (d.count / deviceTotal) * 100 : 0;
                  return (
                    <div key={d._id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {deviceIcon(d._id)}
                          <span className="text-sm text-gray-700 capitalize">{d._id}</span>
                        </div>
                        <span className="text-xs tabular-nums text-gray-500">
                          {d.count.toLocaleString()}
                          <span className="text-gray-400 ml-1">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Browsers */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
            <SectionHead title="Browsers" sub="Breakdown by browser" />
            {data.browserBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No data yet</p>
            ) : (
              <div className="px-5 py-4 space-y-3">
                {data.browserBreakdown.map((b) => {
                  const pct = browserTotal > 0 ? (b.count / browserTotal) * 100 : 0;
                  return (
                    <div key={b._id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700">{b._id}</span>
                        </div>
                        <span className="text-xs tabular-nums text-gray-500">
                          {b.count.toLocaleString()}
                          <span className="text-gray-400 ml-1">({pct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Referrers + recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top referrers */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <SectionHead title="Top referrers" sub="Where visitors came from" />
          {data.topReferrers.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No referrer data yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.topReferrers.map((ref, i) => (
                <div key={ref._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-gray-300 w-5 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <ArrowUpRight size={12} className="text-gray-300 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{ref._id}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 tabular-nums">{ref.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <SectionHead title="Recent activity" sub="Latest page visits" />
          {data.recentViews.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No activity yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {data.recentViews.map((view, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  {deviceIcon(view.device)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate leading-tight">{view.path}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{view.browser}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0 tabular-nums">
                    <Clock size={11} />
                    {fmtTime(view.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
