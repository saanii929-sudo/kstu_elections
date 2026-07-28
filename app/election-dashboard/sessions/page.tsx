"use client";

import { useEffect, useState } from "react";
import { Laptop, Smartphone, Monitor, LogOut, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import { authFetch } from "@/lib/authFetch";

interface DeviceSession {
  id: string;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

function parseDevice(userAgent?: string): { label: string; icon: typeof Laptop } {
  if (!userAgent) return { label: "Unknown device", icon: Monitor };

  const ua = userAgent.toLowerCase();
  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Unknown browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";

  const isMobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone");
  const icon = isMobile ? Smartphone : Laptop;

  return { label: `${browser} on ${os}`, icon };
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const fetchSessions = async () => {
    try {
      const response = await authFetch("/api/auth/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = (session: DeviceSession) => {
    setConfirmModal({
      isOpen: true,
      title: "Log Out Device",
      message: `Log out "${parseDevice(session.userAgent).label}"? That device will need to sign in again.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setRevokingId(session.id);
        try {
          const response = await authFetch(`/api/auth/sessions?id=${session.id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            toast.success("Device logged out");
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to log out device");
          }
        } catch (error) {
          console.error("Revoke session error:", error);
          toast.error("Failed to log out device");
        } finally {
          setRevokingId(null);
        }
      },
    });
  };

  const handleRevokeAllOthers = () => {
    setConfirmModal({
      isOpen: true,
      title: "Log Out All Other Devices",
      message: "This signs out every session except the one you're using right now. Continue?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const response = await authFetch("/api/auth/sessions?all=true", {
            method: "DELETE",
          });
          if (response.ok) {
            toast.success("Logged out of all other devices");
            fetchSessions();
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to log out other devices");
          }
        } catch (error) {
          console.error("Revoke all sessions error:", error);
          toast.error("Failed to log out other devices");
        }
      },
    });
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Active Sessions
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg font-semibold">
              Devices currently signed in to your account.
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <button
              onClick={handleRevokeAllOthers}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-lg font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap"
            >
              <ShieldAlert size={18} />
              Log Out Other Devices ({otherSessionsCount})
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-lg font-semibold">
              No active sessions found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const device = parseDevice(session.userAgent);
              const Icon = device.icon;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {device.label}
                      </p>
                      {session.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {session.ip ? `${session.ip} · ` : ""}Last active {timeAgo(session.lastActiveAt)}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevoke(session)}
                      disabled={revokingId === session.id}
                      title="Log out this device"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <LogOut size={14} />
                      Log Out
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
      />
    </div>
  );
}
