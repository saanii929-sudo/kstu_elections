"use client";

import { useEffect, useState } from "react";
import {
  Plus, Search, Edit, Trash2, Building2, X, Key, Eye, EyeOff,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

/* ─── constants ───────────────────────────────────────────── */

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  active:    { dot: "bg-green-500", text: "text-green-700",  label: "Active"    },
  inactive:  { dot: "bg-gray-300",  text: "text-gray-500",   label: "Inactive"  },
  suspended: { dot: "bg-red-400",   text: "text-red-600",    label: "Suspended" },
};

const TYPE: Record<string, { label: string; cls: string }> = {
  awards:   { label: "Awards",   cls: "bg-blue-50 text-blue-700"     },
  election: { label: "Election", cls: "bg-violet-50 text-violet-700" },
};

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-gray-100 rounded-lg" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-11 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="h-11 bg-gray-50 border-b border-gray-50" />
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-gray-100 rounded" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-lg" />
            <div className="h-4 w-12 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="flex gap-1">
              <div className="w-7 h-7 bg-gray-100 rounded-lg" />
              <div className="w-7 h-7 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

const BLANK_FORM = {
  name: "", email: "", password: "", phone: "",
  address: "", website: "", description: "",
  eventType: "awards", status: "active", deliveryMethod: "email",
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [editingOrg, setEditingOrg]       = useState<any>(null);
  const [search, setSearch]               = useState("");
  const [formData, setFormData]           = useState({ ...BLANK_FORM });
  const [creationResult, setCreationResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [alertModal, setAlertModal]       = useState({
    isOpen: false, title: "", message: "", type: "info" as "success" | "error" | "info" | "warning",
  });
  const [confirmModal, setConfirmModal]   = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {},
  });

  useEffect(() => { fetchOrganizations(); }, [search]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/organizations?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrganizations((await res.json()).data);
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const url = editingOrg
        ? `/api/superadmin/organizations/${editingOrg._id}`
        : "/api/superadmin/organizations";
      const res = await fetch(url, {
        method: editingOrg ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        if (!editingOrg && data.data?.generatedPassword) {
          setCreationResult(data);
          setShowResultModal(true);
        } else {
          setAlertModal({ isOpen: true, title: "Success", message: "Organization saved successfully!", type: "success" });
        }
        closeModal();
        fetchOrganizations();
      } else {
        setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to save organization", type: "error" });
      }
    } catch {
      setAlertModal({ isOpen: true, title: "Error", message: "Failed to save organization", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete organization",
      message: "This will permanently remove the organization and all associated data. Are you sure?",
      onConfirm: () => performDelete(id),
    });
  };

  const performDelete = async (id: string) => {
    setConfirmModal((p) => ({ ...p, isOpen: false }));
    const token = localStorage.getItem("token");
    try {
      await fetch(`/api/superadmin/organizations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrganizations();
    } catch { /* non-critical */ }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOrg(null);
    setFormData({ ...BLANK_FORM });
    setShowPassword(false);
  };

  const openEditModal = (org: any) => {
    setEditingOrg(org);
    setFormData({
      name: org.name, email: org.email, password: "",
      phone: org.phone || "", address: org.address || "",
      website: org.website || "", description: org.description || "",
      eventType: org.eventType || "awards", status: org.status, deliveryMethod: "email",
    });
    setShowModal(true);
  };

  const openCreateModal = () => { setEditingOrg(null); setFormData({ ...BLANK_FORM }); setShowModal(true); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData((p) => ({ ...p, [k]: e.target.value }));

  const needsPhone = !editingOrg && (formData.deliveryMethod === "sms" || formData.deliveryMethod === "both");

  if (loading) return <PageSkeleton />;

  const statusCfg = (s: string) => STATUS[s] ?? STATUS.inactive;
  const typeCfg   = (t: string) => TYPE[t]   ?? TYPE.awards;

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Organizations</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {organizations.length} account{organizations.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm self-start"
        >
          <Plus size={15} />
          Add Organization
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden sm:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {["Organization", "Type", "Status", "Joined", ""].map((h) => (
                <th key={h} className="text-left py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {organizations.length > 0 ? organizations.map((org) => {
              const pal = orgPal(org.name);
              const st  = statusCfg(org.status);
              const tp  = typeCfg(org.eventType);
              return (
                <tr key={org._id} className="group hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate leading-tight">{org.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{org.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${tp.cls}`}>
                      {tp.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                    {fmtDate(org.createdAt)}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(org._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400">No organizations found</p>
                  {search && <p className="text-xs text-gray-300 mt-1">Try a different search term</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile list ── */}
      <div className="sm:hidden bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden divide-y divide-gray-50">
        {organizations.length > 0 ? organizations.map((org) => {
          const pal = orgPal(org.name);
          const st  = statusCfg(org.status);
          const tp  = typeCfg(org.eventType);
          return (
            <div key={org._id} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{org.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${tp.cls}`}>{tp.label}</span>
                      <span className="text-[11px] text-gray-400">{fmtDate(org.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(org._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No organizations found</p>
            {search && <p className="text-xs text-gray-300 mt-1">Try a different search term</p>}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingOrg ? "Edit organization" : "Add organization"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingOrg
                    ? `Updating details for ${editingOrg.name}`
                    : "Create a new organization account on the platform"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mt-0.5"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Organization name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={set("name")}
                      placeholder="e.g. Mediaworks Ghana"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email address <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={set("email")}
                      placeholder="admin@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Type + Delivery or Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Account type <span className="text-red-400">*</span></label>
                    <select value={formData.eventType} onChange={set("eventType")} className={inputCls}>
                      <option value="">Select an account type</option>
                      <option value="awards">Awards & Competitions</option>
                      <option value="election">Institutional Elections</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                      {formData.eventType === "awards"
                        ? "For awards, competitions, and entertainment voting"
                        : "For schools, universities, and organizations"}
                    </p>
                  </div>

                  {!editingOrg ? (
                    <div>
                      <label className={labelCls}>Send credentials via <span className="text-red-400">*</span></label>
                      <select value={formData.deliveryMethod} onChange={set("deliveryMethod")} className={inputCls}>
                        <option value="email">Email only</option>
                        <option value="sms">SMS only</option>
                        <option value="both">Email & SMS</option>
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                        {formData.deliveryMethod === "email"
                          ? "Login credentials sent to the email address"
                          : formData.deliveryMethod === "sms"
                          ? "Credentials sent via SMS — phone required"
                          : "Credentials sent via both email and SMS"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className={labelCls}>New password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={set("password")}
                          placeholder="Leave blank to keep current"
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone + Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Phone number {needsPhone && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="tel"
                      required={needsPhone}
                      value={formData.phone}
                      onChange={set("phone")}
                      placeholder="+233 24 123 4567"
                      className={`${inputCls} ${needsPhone && !formData.phone ? "border-red-300 focus:ring-red-400" : ""}`}
                    />
                    {needsPhone && !formData.phone && (
                      <p className="text-[11px] text-red-500 mt-1.5">Required for SMS delivery</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={set("website")}
                      placeholder="https://example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Address + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={set("address")}
                      placeholder="Street, City, Country"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Status <span className="text-red-400">*</span></label>
                    <select value={formData.status} onChange={set("status")} className={inputCls}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={set("description")}
                    rows={3}
                    placeholder="Brief notes about this organization…"
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {editingOrg ? "Saving…" : "Creating…"}
                    </>
                  ) : (
                    editingOrg ? "Save changes" : "Create organization"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Credentials result modal ── */}
      {showResultModal && creationResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Key className="text-[#D4AF37]" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Organization created</h3>
                <p className="text-xs text-gray-400 mt-0.5">Copy these — they won't be shown again</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 shrink-0">Email</span>
                <span className="text-sm font-mono text-gray-800 text-right break-all">{creationResult.data?.email}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 shrink-0">Password</span>
                <span className="text-sm font-mono font-bold text-green-700 text-right">{creationResult.data?.generatedPassword}</span>
              </div>
            </div>

            <button
              onClick={() => setShowResultModal(false)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Done, I've saved these
            </button>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((p) => ({ ...p, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type="danger"
        confirmText="Delete"
      />
    </div>
  );
}
