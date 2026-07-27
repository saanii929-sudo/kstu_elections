"use client";

import { useEffect, useState } from "react";
import {
  Building2, Users, CheckCircle, XCircle, MessageSquare,
} from "lucide-react";


function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function fmtDay() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Deterministic avatar colour from org name
const PALETTE = [
  { bg: "bg-violet-50", text: "text-violet-700" },
  { bg: "bg-blue-50",   text: "text-blue-700"   },
  { bg: "bg-emerald-50",text: "text-emerald-700" },
  { bg: "bg-amber-50",  text: "text-amber-700"   },
  { bg: "bg-rose-50",   text: "text-rose-700"    },
  { bg: "bg-cyan-50",   text: "text-cyan-700"    },
  { bg: "bg-indigo-50", text: "text-indigo-700"  },
  { bg: "bg-orange-50", text: "text-orange-700"  },
];
function orgPal(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

/* ─── sub-components ──────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-6xl mx-auto">
      <div className="h-20 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-80 bg-gray-100 rounded-2xl" />
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, numColor, iconCls,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  numColor: string;
  iconCls: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 hover:ring-gray-200 transition-all">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconCls}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <p className={`text-3xl sm:text-4xl font-bold leading-none ${numColor}`}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs font-semibold text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [smsBalance, setSmsBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [smsLoading, setSmsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("/api/superadmin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/superadmin/sms-balance", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setSmsBalance(d.data))
      .catch(() => {})
      .finally(() => setSmsLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const statCards = [
    {
      label: "Organizations",
      value: stats?.organizations?.total ?? 0,
      sub: "All registered",
      icon: Building2,
      numColor: "text-gray-900",
      iconCls: "bg-gray-50 text-gray-500",
    },
    {
      label: "Active",
      value: stats?.organizations?.active ?? 0,
      sub: "Currently running",
      icon: CheckCircle,
      numColor: "text-[#D4AF37]",
      iconCls: "bg-green-50 text-[#D4AF37]",
    },
    {
      label: "Inactive",
      value: stats?.organizations?.inactive ?? 0,
      sub: "Paused or closed",
      icon: XCircle,
      numColor: "text-gray-400",
      iconCls: "bg-gray-50 text-gray-400",
    },
    {
      label: "Admins",
      value: stats?.admins?.total ?? 0,
      sub: "System administrators",
      icon: Users,
      numColor: "text-blue-700",
      iconCls: "bg-blue-50 text-blue-500",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
            {fmtDay()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
            {greeting()}, Admin
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's what's happening across the platform today.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] bg-green-50 px-3 py-1.5 rounded-full w-fit self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1C2338] animate-pulse" />
          Live data
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── SMS credit strip ── */}
      <div className="bg-white rounded-xl ring-1 ring-gray-100 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <MessageSquare size={14} className="text-violet-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">SMS Credits</p>
            <p className="text-[11px] text-gray-400">Arkesel gateway balance</p>
          </div>
        </div>
        {smsLoading ? (
          <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
        ) : smsBalance ? (
          <p className="text-sm font-bold text-violet-700 tabular-nums">
            {Number(smsBalance.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            <span className="font-normal text-gray-400 text-xs">credits</span>
          </p>
        ) : (
          <p className="text-xs text-gray-400 italic">Unavailable</p>
        )}
      </div>

      {/* ── Recent organizations ── */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">

        {/* Section header */}
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Recent Organizations</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest accounts registered on the platform</p>
          </div>
          <a
            href="/superadmin/organizations"
            className="text-xs font-semibold text-[#D4AF37] hover:text-[#1C2338] transition-colors"
          >
            View all →
          </a>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["Organization", "Status", "Joined"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-6 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats?.recentOrganizations?.length > 0 ? (
                stats.recentOrganizations.map((org: any) => {
                  const pal = orgPal(org.name);
                  const active = org.status === "active";
                  return (
                    <tr key={org._id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}
                          >
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate leading-tight">
                              {org.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{org.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            active ? "text-[#D4AF37]" : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              active ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500 tabular-nums">
                        {fmtDate(org.createdAt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-sm text-gray-400">
                    No organizations registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="sm:hidden divide-y divide-gray-50">
          {stats?.recentOrganizations?.length > 0 ? (
            stats.recentOrganizations.map((org: any) => {
              const pal = orgPal(org.name);
              const active = org.status === "active";
              return (
                <div key={org._id} className="flex items-center gap-3 px-4 py-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                    <p className="text-xs text-gray-400 truncate">{org.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        active ? "text-[#D4AF37]" : "text-gray-400"
                      }`}
                    >
                      {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(org.createdAt)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-sm text-gray-400">
              No organizations yet
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
