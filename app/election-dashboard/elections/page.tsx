"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Calendar,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Shield,
  RefreshCw,
  LayoutTemplate,
  Zap,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Vote,
  Clock3,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import ElectionStatusBadge from "@/components/ElectionStatusBadge";
import Select from "@/components/Select";
import { authFetch } from "@/lib/authFetch";
import {
  getElectionStatus,
  normalizeAlias,
  isValidAlias,
  ElectionStatusKey,
} from "@/lib/electionStatus";

interface Election {
  _id: string;
  title: string;
  alias: string;
  organizationId?: string;
  organizationName?: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "ended";
  settings: {
    showLiveResults: boolean;
    allowRevote: boolean;
    requireAllCategories: boolean;
    requireOTP: boolean;
    requireAgentSignature: boolean;
  };
  createdAt: string;
  candidateCount?: number;
  voterCount?: number;
  totalVotes?: number;
  approvalStatus?: "pending" | "approved" | "rejected";
  resultsApprovalStatus?: "pending" | "approved" | "rejected";
}

const APPROVAL_BADGE: Record<string, string> = {
  pending: "bg-amber-50  text-amber-700 ",
  approved: "bg-emerald-50  text-emerald-700 ",
  rejected: "bg-red-50  text-red-600 ",
};

const APPROVAL_LABEL: Record<string, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected by Super Admin",
};

type ViewMode = "grid" | "table";
type SortField = "date" | "status" | "createdDate";
type StatusFilter = ElectionStatusKey | "all";

const PAGE_SIZE = 9;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "date", label: "Election Date" },
  { value: "status", label: "Status" },
  { value: "createdDate", label: "Created Date" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [isElectionAdmin, setIsElectionAdmin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    alias: "",
    startDate: "",
    endDate: "",
    organizationId: "",
    showLiveResults: true,
    allowRevote: false,
    requireAllCategories: false,
    requireOTP: false,
    requireAgentSignature: false,
  });
  const [aliasError, setAliasError] = useState<string | null>(null);

  // Search, filters, sort, view, pagination
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  // Unfiltered snapshot of every election, used only for the summary stat pills
  const [statsElections, setStatsElections] = useState<Election[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  // Debounce the raw search input before it drives a fetch
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 whenever a filter/sort/search changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, sortBy, sortDir]);

  useEffect(() => {
    fetchElections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, dateFrom, dateTo, sortBy, sortDir, page]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchElections();
      fetchStats();
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, dateFrom, dateTo, sortBy, sortDir, page]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setIsElectionAdmin(JSON.parse(userData).role === "electionAdmin");
      } catch {
        /* ignore */
      }
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await authFetch("/api/elections");
      if (response.ok) {
        const data = await response.json();
        setStatsElections(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch election stats:", error);
    }
  };

  const fetchElections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const response = await authFetch(`/api/elections?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setResultCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch elections:", error);
      toast.error("Failed to load elections");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedAlias = normalizeAlias(formData.alias);
    if (!isValidAlias(normalizedAlias)) {
      setAliasError("Alias must be 2-20 characters: letters, numbers, and hyphens only.");
      return;
    }
    setAliasError(null);

    if (!editingElection && isElectionAdmin && !formData.organizationId) {
      toast.error("Please select which organization this election belongs to");
      return;
    }

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
          alias: normalizedAlias,
          startDate: formData.startDate,
          endDate: formData.endDate,
          ...(!editingElection && isElectionAdmin ? { organizationId: formData.organizationId } : {}),
          settings: {
            showLiveResults: formData.showLiveResults,
            allowRevote: formData.allowRevote,
            requireAllCategories: formData.requireAllCategories,
            requireOTP: formData.requireOTP,
            requireAgentSignature: formData.requireAgentSignature,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          localStorage.setItem("token", data.token);
          const userData = localStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            localStorage.setItem(
              "user",
              JSON.stringify({ ...user, assignedElections: [...(user.assignedElections || []), data.data._id] })
            );
          }
        }
        toast.success(
          editingElection
            ? "Election updated successfully!"
            : "Election created successfully!"
        );
        setShowModal(false);
        setEditingElection(null);
        resetForm();
        fetchElections();
        fetchStats();
      } else {
        const data = await response.json();
        if (typeof data.error === "string" && data.error.toLowerCase().includes("alias")) {
          setAliasError(data.error);
        }
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
    setAliasError(null);
    setFormData({
      title: election.title,
      alias: election.alias || "",
      startDate: new Date(election.startDate).toISOString().slice(0, 16),
      endDate: new Date(election.endDate).toISOString().slice(0, 16),
      organizationId: election.organizationId || "",
      showLiveResults: election.settings.showLiveResults,
      allowRevote: election.settings.allowRevote,
      requireAllCategories: election.settings.requireAllCategories,
      requireOTP: election.settings.requireOTP ?? false,
      requireAgentSignature: election.settings.requireAgentSignature ?? false,
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
            fetchStats();
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
    setAliasError(null);
    setFormData({
      title: "",
      alias: "",
      startDate: "",
      endDate: "",
      organizationId: availableOrgs.length === 1 ? availableOrgs[0].id : "",
      showLiveResults: true,
      allowRevote: false,
      requireAllCategories: false,
      requireOTP: false,
      requireAgentSignature: false,
    });
  };

  const handleUseAsTemplate = (election: Election) => {
    setEditingElection(null);
    setAliasError(null);
    setFormData({
      title: `${election.title} (Copy)`,
      alias: "",
      startDate: "",
      endDate: "",
      organizationId: election.organizationId || "",
      showLiveResults: election.settings.showLiveResults,
      allowRevote: election.settings.allowRevote,
      requireAllCategories: election.settings.requireAllCategories,
      requireOTP: election.settings.requireOTP ?? false,
      requireAgentSignature: election.settings.requireAgentSignature ?? false,
    });
    setShowModal(true);
    toast.success("Template loaded — update the title and dates");
  };

  // Stats (derived from the unfiltered snapshot, not the paginated/filtered list)
  const totalCount = statsElections.length;
  const liveCount = statsElections.filter((e) => getElectionStatus(e) === "live").length;
  const scheduledCount = statsElections.filter((e) => getElectionStatus(e) === "scheduled").length;
  const closedCount = statsElections.filter((e) => getElectionStatus(e) === "closed").length;

  const availableOrgs = (() => {
    const map = new Map<string, string>();
    for (const e of statsElections) {
      if (e.organizationId) map.set(e.organizationId, e.organizationName || "Unknown organization");
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  })();

  // Full-page skeleton only on first load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header skeleton */}
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-gray-200  animate-pulse" />
            <div className="h-4 w-64 rounded bg-gray-100  animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-gray-200  animate-pulse" />
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white  rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
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
            <h1 className="text-4xl font-bold text-gray-900  tracking-tight">Elections</h1>
            <p className="text-gray-500  mt-1 text-lg font-semibold">
              Manage, monitor, and configure all your elections in one place.
            </p>
            {/* Stats pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600   text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                Total: {totalCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700   text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Live: {liveCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700   text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Scheduled: {scheduledCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600   text-lg font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                Closed: {closedCount}
              </span>
            </div>
          </div>
          {isElectionAdmin && availableOrgs.length === 0 ? (
            <p className="text-sm text-gray-400 max-w-xs text-right">
              You don&apos;t have any elections assigned yet — ask your superadmin to assign one before creating a new election.
            </p>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setEditingElection(null);
                setShowModal(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-white text-lg font-semibold rounded-xl hover:bg-[#d4af37] transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={18} />
              New Election
            </button>
          )}
        </div>

        {/* Toolbar: search, filters, sort, view toggle */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title or alias..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 text-sm bg-white shadow-sm rounded-xl focus:ring-1 focus:ring-[#D4AF37] outline-none placeholder:text-gray-400  transition"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                showFilters || statusFilter !== "all" || dateFrom || dateTo
                  ? "bg-green-50 border-gray-100  shadow-md  text-[#D4AF37]"
                  : "bg-white  border-gray-200 shadow-md text-gray-600 "
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            <div className="flex items-center gap-1.5">
              <div className="w-44">
                <Select
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortField)}
                  searchable={false}
                  options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: `Sort: ${opt.label}` }))}
                />
              </div>
              <button
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
                className="p-2.5 cursor-pointer rounded-xl border border-gray-200 shadow-md bg-white text-gray-500 hover:bg-gray-50  transition-colors"
              >
                <ArrowUpDown size={16} className={sortDir === "asc" ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 shadow-md overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-2.5 cursor-pointer transition-colors border-l border-gray-200  ${
                  viewMode === "table"
                    ? "bg-[#D4AF37] text-white"
                    : "bg-white  text-gray-500  hover:bg-gray-50 "
                }`}
              >
                <Rows3 size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-2.5 cursor-pointer transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#D4AF37] text-white"
                    : "bg-white text-gray-500  hover:bg-gray-50 "
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50  border border-gray-100 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-500  mb-1">Status</label>
                <div className="w-44">
                  <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    searchable={false}
                    options={STATUS_FILTER_OPTIONS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500  mb-1">Starts After</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm text-gray-700 border-gray-200 shadow-md bg-white border  rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Starts Before</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 text-sm text-gray-700  bg-white  border border-gray-200 shadow-md rounded-lg focus:ring-2 focus:ring-[#D4AF37] outline-none"
                />
              </div>
              {(statusFilter !== "all" || dateFrom || dateTo || search) && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                    setSearchInput("");
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-500  hover:text-gray-700  transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
        {/* Empty State */}
        {elections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 bg-white  rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-24 h-24 bg-green-50  rounded-full flex items-center justify-center mb-5">
              <Calendar className="text-[#D4AF37]" size={38} />
            </div>
            {search || statusFilter !== "all" || dateFrom || dateTo ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900  mb-2">No matching elections</h3>
                <p className="text-gray-500  text-lg font-semibold text-center max-w-xs mb-7">
                  Try adjusting your search term or filters.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                    setSearchInput("");
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white text-lg font-semibold rounded-xl hover:bg-[#d4af37] transition-colors shadow-sm"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900  mb-2">No elections yet</h3>
                <p className="text-gray-500  text-lg font-semibold text-center max-w-xs mb-7">
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
              </>
            )}
          </div>
        ) : viewMode === "table" ? (
          <ElectionsTable elections={elections} onEdit={handleEdit} onTemplate={handleUseAsTemplate} onDelete={handleDelete} />
        ) : (
          /* Elections Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map((election) => {
              const enabledChips: { label: string; icon: React.ReactNode }[] = [];
              if (election.settings.showLiveResults)
                enabledChips.push({ label: "Live Results", icon: <Zap size={14} /> });
              if (election.settings.requireOTP)
                enabledChips.push({ label: "OTP Required", icon: <Shield size={14} /> });
              if (election.settings.requireAllCategories)
                enabledChips.push({ label: "All Categories", icon: <CheckCircle2 size={14} /> });
              if (election.settings.allowRevote)
                enabledChips.push({ label: "Revote", icon: <RefreshCw size={14} /> });
              if (election.settings.requireAgentSignature)
                enabledChips.push({ label: "Agent Signature", icon: <UserCheck size={14} /> });

              return (
                <div
                  key={election._id}
                  className="bg-white  rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >

                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900  leading-snug line-clamp-2">
                          {election.title}
                        </h3>
                        {election.alias && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-gray-50  text-gray-500  text-xs font-mono font-semibold tracking-wide">
                            {election.alias}
                          </span>
                        )}
                        {election.approvalStatus && election.approvalStatus !== "approved" && (
                          <span
                            className={`inline-block mt-1 ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${APPROVAL_BADGE[election.approvalStatus]}`}
                            title="Super Admin oversight status — informational only, does not affect your ability to run this election"
                          >
                            {APPROVAL_LABEL[election.approvalStatus]}
                          </span>
                        )}
                        {election.resultsApprovalStatus && election.resultsApprovalStatus !== "approved" && (
                          <span
                            className={`inline-block mt-1 ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${APPROVAL_BADGE[election.resultsApprovalStatus]}`}
                            title="Super Admin review status for this election's results — informational only"
                          >
                            Results: {APPROVAL_LABEL[election.resultsApprovalStatus]}
                          </span>
                        )}
                      </div>
                      <ElectionStatusBadge election={election} />
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-2 text-lg text-gray-400 0">
                      <Calendar size={13} className="text-[#D4AF37] shrink-0" />
                      <span>
                        {formatDate(election.startDate)} -to- {formatDate(election.endDate)}
                      </span>
                    </div>

                    {/* Time range */}
                    <div className="flex items-center gap-2 text-lg text-gray-400 0">
                      <Clock3 size={13} className="text-[#D4AF37] shrink-0" />
                      <span>
                        {formatTime(election.startDate)} -to- {formatTime(election.endDate)}
                      </span>
                    </div>

                    {/* Counts */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 ">
                      <span className="inline-flex items-center gap-1.5">
                        <UserCheck size={14} className="text-[#D4AF37]" />
                        {election.candidateCount ?? 0} candidates
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} className="text-[#D4AF37]" />
                        {election.voterCount ?? 0} voters
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Vote size={14} className="text-[#D4AF37]" />
                        {election.totalVotes ?? 0} votes
                      </span>
                    </div>

                    {/* Settings chips */}
                    {enabledChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {enabledChips.map((chip) => (
                          <span
                            key={chip.label}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50  text-[#D4AF37]  text-sm font-medium border border-green-100 "
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
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50  text-[#D4AF37]  text-lg font-medium rounded-lg hover:bg-green-100  transition-colors"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleUseAsTemplate(election)}
                      title="Use as template"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50  text-gray-500  text-lg font-medium rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <LayoutTemplate size={14} />
                      <span className="hidden sm:inline text-sm">Template</span>
                    </button>
                    <button
                      onClick={() => handleDelete(election._id)}
                      title="Delete election"
                      className="inline-flex items-center justify-center px-3 py-2 bg-red-50  text-red-500  rounded-lg hover:bg-red-100  transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {elections.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500 ">
              Page {page} of {totalPages} · {resultCount} result{resultCount === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600  border border-gray-200  rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50  transition-colors"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600  border border-gray-200  rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50  transition-colors"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white  rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
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
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 0">
                  Election Details
                </p>

                {!editingElection && isElectionAdmin && availableOrgs.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700  mb-1.5">
                      Organization <span className="text-red-400">*</span>
                    </label>
                    <Select
                      value={formData.organizationId}
                      onChange={(v) => setFormData({ ...formData, organizationId: v })}
                      placeholder="Select an organization…"
                      options={availableOrgs.map((org) => ({ value: org.id, label: org.name }))}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700  mb-1.5">
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
                    className="w-full text-gray-900  bg-transparent  border border-gray-200  rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700  mb-1.5">
                    Election Alias <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.alias}
                    onChange={(e) => {
                      setAliasError(null);
                      setFormData({ ...formData, alias: e.target.value.toUpperCase() });
                    }}
                    placeholder="e.g., SRC2026"
                    maxLength={20}
                    className={`w-full text-gray-900  bg-transparent  border rounded-xl px-4 py-2.5 text-sm font-mono tracking-wide focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 transition ${
                      aliasError ? "border-red-300 " : "border-gray-200 "
                    }`}
                  />
                  <p className="text-xs text-gray-400 0 mt-1">
                    {aliasError || "A short, unique code used in search, SMS notifications, and reports."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700  mb-1.5">
                      Start Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full text-gray-900  bg-transparent  border border-gray-200  rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700  mb-1.5">
                      End Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full text-gray-900  bg-transparent  border border-gray-200  rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Voting Settings section */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 0">
                  Voting Settings
                </p>

                {/* Show Live Results */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50  flex items-center justify-center shrink-0 mt-0.5">
                      <Zap size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 ">Show Live Results</p>
                      <p className="text-xs text-gray-400 0 mt-0.5">
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
                      formData.showLiveResults ? "bg-green-600" : "bg-gray-200 "
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
                    <div className="w-8 h-8 rounded-lg bg-green-50  flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 ">Allow Revote</p>
                      <p className="text-xs text-gray-400 0 mt-0.5">
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
                      formData.allowRevote ? "bg-green-600" : "bg-gray-200 "
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
                    <div className="w-8 h-8 rounded-lg bg-green-50  flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 ">Require All Categories</p>
                      <p className="text-xs text-gray-400 0 mt-0.5">
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
                      formData.requireAllCategories ? "bg-green-600" : "bg-gray-200 "
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
                    <div className="w-8 h-8 rounded-lg bg-green-50  flex items-center justify-center shrink-0 mt-0.5">
                      <Shield size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 ">Require OTP Verification</p>
                      <p className="text-xs text-gray-400 0 mt-0.5">
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
                      formData.requireOTP ? "bg-green-600" : "bg-gray-200 "
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.requireOTP ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Require Agent Signature */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50  flex items-center justify-center shrink-0 mt-0.5">
                      <UserCheck size={14} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 ">Require Agent Signature</p>
                      <p className="text-xs text-gray-400 0 mt-0.5">
                        Only a candidate&apos;s assigned polling agent (password-verified) can sign for
                        them in Reports. When off, anyone can sign directly.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, requireAgentSignature: !formData.requireAgentSignature })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      formData.requireAgentSignature ? "bg-green-600" : "bg-gray-200 "
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.requireAgentSignature ? "translate-x-6" : "translate-x-1"
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
                  className="px-5 py-2.5 text-sm font-medium text-gray-600  border border-gray-200  rounded-xl hover:bg-gray-50  transition-colors"
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

function ElectionsTable({
  elections,
  onEdit,
  onTemplate,
  onDelete,
}: {
  elections: Election[];
  onEdit: (election: Election) => void;
  onTemplate: (election: Election) => void;
  onDelete: (electionId: string) => void;
}) {
  return (
    <div className="bg-white  rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500 ">Election</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500 ">Status</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500 ">Dates</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500 ">Time</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500  text-right">Candidates</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500  text-right">Voters</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500  text-right">Votes</th>
              <th className="px-4 py-6 text-xs font-semibold uppercase tracking-wide text-gray-500  text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 ">
            {elections.map((election) => (
              <tr key={election._id} className="hover:bg-gray-50  transition-colors">
                <td className="px-4 py-6">
                  <p className="font-bold text-gray-900  text-sm leading-snug">{election.title}</p>
                  {election.alias && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-gray-50  text-gray-500  text-xs font-mono font-semibold tracking-wide">
                      {election.alias}
                    </span>
                  )}
                  {election.approvalStatus && election.approvalStatus !== "approved" && (
                    <span
                      className={`inline-block mt-0.5 ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${APPROVAL_BADGE[election.approvalStatus]}`}
                      title="Super Admin oversight status — informational only, does not affect your ability to run this election"
                    >
                      {APPROVAL_LABEL[election.approvalStatus]}
                    </span>
                  )}
                  {election.resultsApprovalStatus && election.resultsApprovalStatus !== "approved" && (
                    <span
                      className={`inline-block mt-0.5 ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${APPROVAL_BADGE[election.resultsApprovalStatus]}`}
                      title="Super Admin review status for this election's results — informational only"
                    >
                      Results: {APPROVAL_LABEL[election.resultsApprovalStatus]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ElectionStatusBadge election={election} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500  whitespace-nowrap">
                  {formatDate(election.startDate)} -to- {formatDate(election.endDate)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500  whitespace-nowrap">
                  {formatTime(election.startDate)} -to- {formatTime(election.endDate)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700  text-right tabular-nums">
                  {election.candidateCount ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700  text-right tabular-nums">
                  {election.voterCount ?? 0}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700  text-right tabular-nums">
                  {election.totalVotes ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(election)}
                      title="Edit election"
                      className="p-2 rounded-lg cursor-pointer bg-green-50  text-[#D4AF37]  hover:bg-green-100  transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => onTemplate(election)}
                      title="Use as template"
                      className="p-2 rounded-lg bg-gray-50  text-gray-500  hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <LayoutTemplate size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(election._id)}
                      title="Delete election"
                      className="p-2 rounded-lg cursor-pointer bg-red-50  text-red-500  hover:bg-red-100  transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
