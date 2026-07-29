"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, ShieldCheck, X, UserCog } from "lucide-react";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface AdminRecord {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  role: "superadmin" | "admin" | "helpdesk" | "electionAdmin";
  status: "active" | "inactive";
  createdAt: string;
  assignedElections?: (string | { _id: string; title: string })[];
}

interface ElectionOption {
  _id: string;
  title: string;
}

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  helpdesk: "Help Desk",
  electionAdmin: "Election Admin",
};

const ROLE_STYLE: Record<string, string> = {
  superadmin: "bg-violet-50 text-violet-700",
  admin: "bg-blue-50 text-blue-700",
  helpdesk: "bg-amber-50 text-amber-700",
  electionAdmin: "bg-emerald-50 text-emerald-700",
};

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  active: { dot: "bg-green-500", text: "text-green-700", label: "Active" },
  inactive: { dot: "bg-red-400", text: "text-red-600", label: "Suspended" },
};

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

const BLANK_FORM = { username: "", email: "", phone: "", role: "admin", status: "active", assignedElections: [] as string[] };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [formData, setFormData] = useState({ ...BLANK_FORM });
  const [elections, setElections] = useState<ElectionOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info" as "success" | "error" | "info" | "warning",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {},
  });

  useEffect(() => {
    fetchAdmins();
  }, [search]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/admins?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAdmins((await res.json()).data);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/elections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setElections((await res.json()).data);
    } catch {
      /* non-critical */
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({ ...BLANK_FORM });
  };

  const openCreateModal = () => {
    setEditingAdmin(null);
    setFormData({ ...BLANK_FORM });
    setShowModal(true);
    if (elections.length === 0) fetchElections();
  };

  const openEditModal = (admin: AdminRecord) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      phone: admin.phone || "",
      role: admin.role,
      status: admin.status,
      assignedElections: (admin.assignedElections || []).map((e) => (typeof e === "string" ? e : e._id)),
    });
    setShowModal(true);
    if (elections.length === 0) fetchElections();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((p) => ({ ...p, [k]: e.target.value }));

  const toggleElection = (electionId: string) => {
    setFormData((p) => ({
      ...p,
      assignedElections: p.assignedElections.includes(electionId)
        ? p.assignedElections.filter((id) => id !== electionId)
        : [...p.assignedElections, electionId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const url = editingAdmin
        ? `/api/superadmin/admins/${editingAdmin._id}`
        : "/api/superadmin/admins";
      const res = await fetch(url, {
        method: editingAdmin ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertModal({
          isOpen: true,
          title: "Success",
          message: editingAdmin
            ? "Administrator updated successfully."
            : data.credentialsSentVia === "sms"
              ? "Administrator created — login credentials were sent via SMS."
              : "Administrator created — login credentials were emailed to them.",
          type: "success",
        });
        closeModal();
        fetchAdmins();
      } else {
        setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to save administrator", type: "error" });
      }
    } catch {
      setAlertModal({ isOpen: true, title: "Error", message: "Failed to save administrator", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = (admin: AdminRecord) => {
    const nextStatus = admin.status === "active" ? "inactive" : "active";
    setConfirmModal({
      isOpen: true,
      title: nextStatus === "inactive" ? "Suspend Administrator" : "Activate Administrator",
      message:
        nextStatus === "inactive"
          ? `Suspend ${admin.username}? They will be unable to log in until reactivated.`
          : `Reactivate ${admin.username}'s account?`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(`/api/superadmin/admins/${admin._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: nextStatus }),
          });
          const data = await res.json();
          if (res.ok) {
            fetchAdmins();
          } else {
            setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to update status", type: "error" });
          }
        } catch {
          setAlertModal({ isOpen: true, title: "Error", message: "Failed to update status", type: "error" });
        }
      },
    });
  };

  const handleDelete = (admin: AdminRecord) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Administrator",
      message: `Permanently remove ${admin.username}'s account? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        const token = localStorage.getItem("token");
        try {
          const res = await fetch(`/api/superadmin/admins/${admin._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            fetchAdmins();
          } else {
            setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to delete administrator", type: "error" });
          }
        } catch {
          setAlertModal({ isOpen: true, title: "Error", message: "Failed to delete administrator", type: "error" });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-7 w-52 bg-gray-100 rounded-lg" />
        <div className="h-11 bg-gray-100 rounded-xl" />
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Administrators</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {admins.length} administrator{admins.length !== 1 ? "s" : ""} across the platform
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c19d2f] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm self-start"
        >
          <Plus size={15} />
          Add Administrator
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Search by username or email…"
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

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              {["Administrator", "Role", "Status", "Joined", ""].map((h) => (
                <th
                  key={h}
                  className="text-left py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {admins.length > 0 ? (
              admins.map((admin) => {
                const st = STATUS_STYLE[admin.status] ?? STATUS_STYLE.inactive;
                return (
                  <tr key={admin._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <ShieldCheck size={16} className="text-[#D4AF37]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{admin.username}</p>
                          <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${ROLE_STYLE[admin.role]}`}>
                        {ROLE_LABEL[admin.role]}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <button
                        onClick={() => toggleStatus(admin)}
                        className="inline-flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                        title={admin.status === "active" ? "Click to suspend" : "Click to activate"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-gray-500 text-xs">{fmtDate(admin.createdAt)}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <UserCog className="mx-auto mb-2 text-gray-300" size={32} />
                  <p className="text-sm text-gray-400">No administrators found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1c2338] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingAdmin ? "Edit Administrator" : "New Administrator"}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={set("username")}
                  className={inputCls}
                  placeholder="e.g. jane.doe"
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={set("email")}
                  className={inputCls}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={set("phone")}
                  className={inputCls}
                  placeholder="e.g. 0241234567"
                />
                <p className="text-xs text-gray-400 mt-1">
                  When set, login verification codes are sent by SMS instead of email.
                </p>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select value={formData.role} onChange={set("role")} className={inputCls}>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="helpdesk">Help Desk</option>
                  <option value="electionAdmin">Election Admin</option>
                </select>
              </div>
              {formData.role === "electionAdmin" && (
                <div>
                  <label className={labelCls}>Assign Elections *</label>
                  <div className="border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                    {elections.length === 0 ? (
                      <p className="text-xs text-gray-400 px-1 py-2">No elections found.</p>
                    ) : (
                      elections.map((election) => (
                        <label
                          key={election._id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignedElections.includes(election._id)}
                            onChange={() => toggleElection(election._id)}
                            className="w-4 h-4 text-[#D4AF37] rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">{election.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {formData.assignedElections.length} election(s)
                  </p>
                </div>
              )}
              {editingAdmin && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={formData.status} onChange={set("status")} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Suspended</option>
                  </select>
                </div>
              )}
              {!editingAdmin && (
                <p className="text-xs text-gray-400">
                  A secure password will be generated automatically and emailed to this address.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#D4AF37] text-white rounded-xl hover:bg-[#c19d2f] transition-colors shadow-sm disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editingAdmin ? "Save Changes" : "Create Administrator"}
                </button>
              </div>
            </form>
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
      />
    </div>
  );
}
