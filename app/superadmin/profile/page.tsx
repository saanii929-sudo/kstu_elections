"use client";

import { useEffect, useState } from "react";
import { UserCircle, Lock, Save } from "lucide-react";
import toast from "react-hot-toast";
import AlertModal from "@/components/AlertModal";

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function SuperAdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState({ username: "", email: "", phone: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "warning",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/superadmin/profile", {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = (await res.json()).data;
          setForm({
            username: data.username || "",
            email: data.email || "",
            phone: data.phone || "",
          });
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated successfully");
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...user,
              name: data.data.username,
              email: data.data.email,
            }),
          );
        }
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertModal({
          isOpen: true,
          title: "Password Changed",
          message: "Your password has been updated successfully.",
          type: "success",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse max-w-2xl">
        <div className="h-7 w-52 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          My Profile
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage your account details and password
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <div className="bg-[#1c2338] px-6 py-4 flex items-center gap-2.5">
            <UserCircle className="text-[#D4AF37]" size={18} />
            <h2 className="text-white font-semibold">Account Details</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div>
              <label className={labelCls}>Username</label>
              <input
                className={inputCls}
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                className={inputCls}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="e.g. 0241234567"
              />
              <p className="text-xs text-gray-400 mt-1">
                When set, login verification codes are sent by SMS instead of
                email.
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#D4AF37] text-white rounded-xl hover:bg-[#c19d2f] transition-colors shadow-sm disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          <div className="bg-[#1c2338] px-6 py-4 flex items-center gap-2.5">
            <Lock className="text-[#D4AF37]" size={18} />
            <h2 className="text-white font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input
                type="password"
                className={inputCls}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input
                type="password"
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input
                type="password"
                className={inputCls}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#1c2338] text-white rounded-xl hover:bg-[#2a3350] transition-colors shadow-sm disabled:opacity-60"
              >
                <Lock size={15} />
                {changingPassword ? "Updating…" : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((p) => ({ ...p, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
