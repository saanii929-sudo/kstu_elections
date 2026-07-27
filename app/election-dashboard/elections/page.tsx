"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Calendar,
  Edit,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  Shield,
  RefreshCw,
  LayoutTemplate,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import { authFetch } from "@/lib/authFetch";

interface Election {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "ended";
  settings: {
    showLiveResults: boolean;
    allowRevote: boolean;
    requireAllCategories: boolean;
    requireOTP: boolean;
  };
  createdAt: string;
}

function getComputedStatus(election: Election): "active" | "draft" | "ended" {
  const now = new Date();
  const start = new Date(election.startDate);
  const end = new Date(election.endDate);
  if (election.status === "ended" || now > end) return "ended";
  if (election.status === "active" || (now >= start && now <= end)) return "active";
  return "draft";
}

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    endDate: "",
    showLiveResults: true,
    allowRevote: false,
    requireAllCategories: false,
    requireOTP: false,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await authFetch("/api/elections");
      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch elections:", error);
      toast.error("Failed to load elections");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingElection
        ? `/api/elections/${editingElection._id}`
        : "/api/elections";
      const method = editingElection ? "PUT" : "POST";
      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          settings: {
            showLiveResults: formData.showLiveResults,
            allowRevote: formData.allowRevote,
            requireAllCategories: formData.requireAllCategories,
            requireOTP: formData.requireOTP,
          },
        }),
      });
      if (response.ok) {
        toast.success(
          editingElection
            ? "Election updated successfully!"
            : "Election created successfully!"
        );
        setShowModal(false);
        setEditingElection(null);
        resetForm();
        fetchElections();
      } else {
        const data = await response.json();
        toast.error(
          data.error ||
            `Failed to ${editingElection ? "update" : "create"} election`
        );
      }
    } catch (error) {
      console.error("Submit election error:", error);
      toast.error(
        `Failed to ${editingElection ? "update" : "create"} election`
      );
    }
  };

  const handleEdit = (election: Election) => {
    setEditingElection(election);
    setFormData({
      title: election.title,
      startDate: new Date(election.startDate).toISOString().slice(0, 16),
      endDate: new Date(election.endDate).toISOString().slice(0, 16),
      showLiveResults: election.settings.showLiveResults,
      allowRevote: election.settings.allowRevote,
      requireAllCategories: election.settings.requireAllCategories,
      requireOTP: election.settings.requireOTP ?? false,
    });
    setShowModal(true);
  };

  const handleDelete = async (electionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Election",
      message:
        "Are you sure you want to delete this election? This action cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          const response = await authFetch(`/api/elections/${electionId}`, {
            method: "DELETE",
          });
          if (response.ok) {
            toast.success("Election deleted successfully!");
            fetchElections();
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to delete election");
          }
        } catch (error) {
          console.error("Delete election error:", error);
          toast.error("Failed to delete election");
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      startDate: "",
      endDate: "",
      showLiveResults: true,
      allowRevote: false,
      requireAllCategories: false,
      requireOTP: false,
    });
  };

  const handleUseAsTemplate = (election: Election) => {
    setEditingElection(null);
    setFormData({
      title: `${election.title} (Copy)`,
      startDate: "",
      endDate: "",
      showLiveResults: election.settings.showLiveResults,
      allowRevote: election.settings.allowRevote,
      requireAllCategories: election.settings.requireAllCategories,
      requireOTP: election.settings.requireOTP ?? false,
    });
    setShowModal(true);
    toast.success("Template loaded — update the title and dates");
  };

  // Stats
  const totalCount = elections.length;
  const activeCount = elections.filter((e) => getComputedStatus(e) === "active").length;
  const draftCount = elections.filter((e) => getComputedStatus(e) === "draft").length;
  const endedCount = elections.filter((e) => getComputedStatus(e) === "ended").length;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        {/* Header skeleton */}
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-64 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
            >
              <div className="h-2 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-5 w-36 rounded bg-gray-200" />
                  <div className="h-5 w-16 rounded-full bg-gray-100" />
                </div>
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-2/3 rounded bg-gray-100" />
                <div className="h-4 w-48 rounded bg-gray-100" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-16 rounded-full bg-gray-100" />
                  <div className="h-6 w-16 rounded-full bg-gray-100" />
                </div>
              </div>
              <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
                <div className="h-8 flex-1 rounded-lg bg-gray-100" />
                <div className="h-8 w-10 rounded-lg bg-gray-100" />
                <div className="h-8 w-10 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Elections</h1>
            <p className="text-gray-500 mt-1 text-lg font-semibold">
              Manage, monitor, and configure all your elections in one place.
            </p>
            {/* Stats pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                Total: {totalCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-[#D4AF37] text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block" />
                Active: {activeCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Draft: {draftCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                Ended: {endedCount}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingElection(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-white text-lg font-semibold rounded-xl hover:bg-[#d4af37] transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            New Election
          </button>
        </div>

        {/* Empty State */}
        {elections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-5">
              <Calendar className="text-[#D4AF37]" size={38} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No elections yet</h3>
            <p className="text-gray-500 text-lg font-semibold text-center max-w-xs mb-7">
              You haven&apos;t created any elections. Start by setting up your first one — it only takes a minute.
            </p>
            <button
              onClick={() => {
                resetForm();
                setEditingElection(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white text-lg font-semibold rounded-xl hover:bg-[#d4af37] transition-colors shadow-sm"
            >
              <Plus size={22} />
              Create Your First Election
            </button>
          </div>
        ) : (
          /* Elections Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map((election) => {
              const computedStatus = getComputedStatus(election);

              const enabledChips: { label: string; icon: React.ReactNode }[] = [];
              if (election.settings.showLiveResults)
                enabledChips.push({ label: "Live Results", icon: <Zap size={14} /> });
              if (election.settings.requireOTP)
                enabledChips.push({ label: "OTP Required", icon: <Shield size={14} /> });
              if (election.settings.requireAllCategories)
                enabledChips.push({ label: "All Categories", icon: <CheckCircle2 size={14} /> });
              if (election.settings.allowRevote)
                enabledChips.push({ label: "Revote", icon: <RefreshCw size={14} /> });

              return (
                <div
                  key={election._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >

                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 flex-1">
                        {election.title}
                      </h3>
                      {computedStatus === "active" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-[#D4AF37] text-sm font-semibold whitespace-nowrap shrink-0">
                          <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#D4AF37]" />
                          </span>
                          Live
                        </span>
                      )}
                      {computedStatus === "draft" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold whitespace-nowrap shrink-0">
                          <Clock size={12} />
                          Draft
                        </span>
                      )}
                      {computedStatus === "ended" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold whitespace-nowrap shrink-0">
                          <CheckCircle2 size={12} />
                          Ended
                        </span>
                      )}
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-2 text-lg text-gray-400">
                      <Calendar size={13} className="text-[#D4AF37] shrink-0" />
                      <span>
                        {new Date(election.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" — "}
                        {new Date(election.endDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Settings chips */}
                    {enabledChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {enabledChips.map((chip) => (
                          <span
                            key={chip.label}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-[#D4AF37] text-sm font-medium border border-green-100"
                          >
                            {chip.icon}
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(election)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-[#D4AF37] text-lg font-medium rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleUseAsTemplate(election)}
                      title="Use as template"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-500 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <LayoutTemplate size={14} />
                      <span className="hidden sm:inline text-sm">Template</span>
                    </button>
                    <button
                      onClick={() => handleDelete(election._id)}
                      title="Delete election"
                      className="inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal header */}
            <div className="bg-[#1c2338] px-6 py-4 rounded-t-2xl flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {editingElection
                    ? "Edit Election"
                    : formData.title.endsWith("(Copy)")
                    ? "Create from Template"
                    : "New Election"}
                </h2>
                <p className="text-green-200 text-xs mt-0.5">
                  {editingElection
                    ? "Update the details of this election."
                    : "Fill in the details to launch your election."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingElection(null);
                  resetForm();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Election Details section */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Election Details
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Election Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Student Union Elections 2026"
                    className="w-full text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none placeholder:text-gray-300 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Voting Settings section */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Voting Settings
                </p>

                {/* Show Live Results */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Show Live Results</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Voters can see real-time results while voting is active.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, showLiveResults: !formData.showLiveResults })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      formData.showLiveResults ? "bg-green-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.showLiveResults ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Allow Revote */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Allow Revote</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Voters can change their vote before the election closes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, allowRevote: !formData.allowRevote })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      formData.allowRevote ? "bg-green-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.allowRevote ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Require All Categories */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Require All Categories</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Voters must cast a vote in every category to submit.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        requireAllCategories: !formData.requireAllCategories,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      formData.requireAllCategories ? "bg-green-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.requireAllCategories ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Require OTP */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Require OTP Verification</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Voters must verify with a one-time code after logging in.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, requireOTP: !formData.requireOTP })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      formData.requireOTP ? "bg-green-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.requireOTP ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingElection(null);
                    resetForm();
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold bg-[#D4AF37] text-white rounded-xl hover:bg-[#d4af37] transition-colors shadow-sm"
                >
                  {editingElection ? "Update Election" : "Create Election"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
