"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Users,
  Vote,
  UserCheck,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";
import ElectionStatusBadge from "@/components/ElectionStatusBadge";

interface SuperAdminElection {
  _id: string;
  title: string;
  alias: string;
  organizationName: string;
  status: string;
  startDate: string;
  endDate: string;
  approvalStatus: "pending" | "approved" | "rejected";
  resultsApprovalStatus: "pending" | "approved" | "rejected";
  candidateCount: number;
  voterCount: number;
  totalVotes: number;
}

interface CandidateRecord {
  _id: string;
  name: string;
  ballotNumber: number;
  voteCount: number;
  approvalStatus: "pending" | "approved" | "rejected";
}

const APPROVAL_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

const APPROVAL_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function SuperAdminElectionsPage() {
  const [elections, setElections] = useState<SuperAdminElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [candidatesByElection, setCandidatesByElection] = useState<Record<string, CandidateRecord[]>>({});
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  // Tracks in-flight approval requests (by a composite key) so a fast
  // double-click can't fire the same decision twice and double-log it.
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [resetTarget, setResetTarget] = useState<SuperAdminElection | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info" as "success" | "error" | "info" | "warning",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {},
  });

  useEffect(() => {
    fetchElections();
  }, [search, approvalFilter]);

  const fetchElections = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (approvalFilter !== "all") params.set("approvalStatus", approvalFilter);
      const res = await fetch(`/api/superadmin/elections?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (res.ok) setElections((await res.json()).data);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (election: SuperAdminElection) => {
    if (expandedId === election._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(election._id);
    if (!candidatesByElection[election._id]) {
      setCandidatesLoading(true);
      try {
        const res = await fetch(`/api/superadmin/candidates?electionId=${election._id}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setCandidatesByElection((prev) => ({ ...prev, [election._id]: data.data }));
        }
      } catch {
        /* non-critical */
      } finally {
        setCandidatesLoading(false);
      }
    }
  };

  const setElectionApproval = async (
    election: SuperAdminElection,
    field: "approvalStatus" | "resultsApprovalStatus",
    decision: "approved" | "rejected"
  ) => {
    if (election[field] === decision) return;
    const key = `election:${election._id}:${field}`;
    if (pendingKeys.has(key)) return;

    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/superadmin/elections/${election._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ field, decision }),
      });
      if (res.ok) {
        fetchElections();
      } else {
        const data = await res.json();
        setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to update approval", type: "error" });
      }
    } catch {
      setAlertModal({ isOpen: true, title: "Error", message: "Failed to update approval", type: "error" });
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const setCandidateApproval = async (
    electionId: string,
    candidateId: string,
    decision: "approved" | "rejected"
  ) => {
    const current = candidatesByElection[electionId]?.find((c) => c._id === candidateId);
    if (current?.approvalStatus === decision) return;
    const key = `candidate:${candidateId}`;
    if (pendingKeys.has(key)) return;

    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/superadmin/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        const data = await res.json();
        setCandidatesByElection((prev) => ({
          ...prev,
          [electionId]: prev[electionId].map((c) => (c._id === candidateId ? data.data : c)),
        }));
      } else {
        const data = await res.json();
        setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to update candidate", type: "error" });
      }
    } catch {
      setAlertModal({ isOpen: true, title: "Error", message: "Failed to update candidate", type: "error" });
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const openResetModal = (election: SuperAdminElection) => {
    setResetReason("");
    setResetTarget(election);
  };

  const submitReset = () => {
    if (!resetTarget) return;
    if (!resetReason.trim()) {
      setAlertModal({ isOpen: true, title: "Reason required", message: "Please provide a reason for clearing votes.", type: "warning" });
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Reset All Votes",
      message: `This permanently deletes every recorded vote for "${resetTarget.title}" and resets voter/candidate tallies. This cannot be undone. Continue?`,
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        setResetSubmitting(true);
        try {
          const res = await fetch(`/api/superadmin/elections/${resetTarget._id}/reset-votes`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ reason: resetReason.trim() }),
          });
          const data = await res.json();
          if (res.ok) {
            setAlertModal({ isOpen: true, title: "Votes Reset", message: data.message, type: "success" });
            setResetTarget(null);
            fetchElections();
          } else {
            setAlertModal({ isOpen: true, title: "Error", message: data.error || "Failed to reset votes", type: "error" });
          }
        } catch {
          setAlertModal({ isOpen: true, title: "Error", message: "Failed to reset votes", type: "error" });
        } finally {
          setResetSubmitting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-7 w-64 bg-gray-100 rounded-lg" />
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Elections Monitor</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {elections.length} election{elections.length !== 1 ? "s" : ""} across all organizations
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by title or alias…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
          />
        </div>
        <select
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Approval Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {[
                  { key: "expand", label: "" },
                  { key: "election", label: "Election" },
                  { key: "organization", label: "Organization" },
                  { key: "status", label: "Status" },
                  { key: "approval", label: "Approval" },
                  { key: "results", label: "Results" },
                  { key: "counts", label: "Counts" },
                  { key: "actions", label: "" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {elections.length > 0 ? (
                elections.map((election) => (
                  <Fragment key={election._id}>
                    <tr className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleExpand(election)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          {expandedId === election._id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900">{election.title}</p>
                        <p className="text-xs text-gray-400 font-mono">{election.alias}</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{election.organizationName || "—"}</td>
                      <td className="py-3.5 px-4">
                        <ElectionStatusBadge election={election} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${APPROVAL_STYLE[election.approvalStatus]}`}>
                            {APPROVAL_LABEL[election.approvalStatus]}
                          </span>
                          {election.approvalStatus !== "approved" && (
                            <button
                              onClick={() => setElectionApproval(election, "approvalStatus", "approved")}
                              disabled={pendingKeys.has(`election:${election._id}:approvalStatus`)}
                              title="Approve election"
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {election.approvalStatus !== "rejected" && (
                            <button
                              onClick={() => setElectionApproval(election, "approvalStatus", "rejected")}
                              disabled={pendingKeys.has(`election:${election._id}:approvalStatus`)}
                              title="Reject election"
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${APPROVAL_STYLE[election.resultsApprovalStatus]}`}>
                            {APPROVAL_LABEL[election.resultsApprovalStatus]}
                          </span>
                          {election.resultsApprovalStatus !== "approved" && (
                            <button
                              onClick={() => setElectionApproval(election, "resultsApprovalStatus", "approved")}
                              disabled={pendingKeys.has(`election:${election._id}:resultsApprovalStatus`)}
                              title="Approve results"
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {election.resultsApprovalStatus !== "rejected" && (
                            <button
                              onClick={() => setElectionApproval(election, "resultsApprovalStatus", "rejected")}
                              disabled={pendingKeys.has(`election:${election._id}:resultsApprovalStatus`)}
                              title="Reject results"
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><UserCheck size={12} />{election.candidateCount}</span>
                          <span className="inline-flex items-center gap-1"><Users size={12} />{election.voterCount}</span>
                          <span className="inline-flex items-center gap-1"><Vote size={12} />{election.totalVotes}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => openResetModal(election)}
                          title="Reset all votes"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors whitespace-nowrap"
                        >
                          <RotateCcw size={12} />
                          Reset Votes
                        </button>
                      </td>
                    </tr>
                    {expandedId === election._id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50/60 px-6 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                            Candidates
                          </p>
                          {candidatesLoading && !candidatesByElection[election._id] ? (
                            <p className="text-sm text-gray-400">Loading candidates…</p>
                          ) : (candidatesByElection[election._id] || []).length === 0 ? (
                            <p className="text-sm text-gray-400">No candidates yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {(candidatesByElection[election._id] || []).map((c) => (
                                <div
                                  key={c._id}
                                  className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-2.5 ring-1 ring-gray-100"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      #{c.ballotNumber} {c.name}
                                    </p>
                                    <p className="text-xs text-gray-400">{c.voteCount} votes</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${APPROVAL_STYLE[c.approvalStatus]}`}>
                                      {APPROVAL_LABEL[c.approvalStatus]}
                                    </span>
                                    {c.approvalStatus !== "approved" && (
                                      <button
                                        onClick={() => setCandidateApproval(election._id, c._id, "approved")}
                                        disabled={pendingKeys.has(`candidate:${c._id}`)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <CheckCircle2 size={13} />
                                      </button>
                                    )}
                                    {c.approvalStatus !== "rejected" && (
                                      <button
                                        onClick={() => setCandidateApproval(election._id, c._id, "rejected")}
                                        disabled={pendingKeys.has(`candidate:${c._id}`)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <XCircle size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                    No elections found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Reset Votes</h2>
              <p className="text-red-100 text-xs mt-0.5">{resetTarget.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                This permanently deletes all {resetTarget.totalVotes} recorded vote(s), resets every
                candidate&apos;s tally to zero, and allows voters to vote again. Use this only when a
                voting session was interrupted or cancelled.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Reason for clearing votes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Voting session interrupted by a system outage"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-colors"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setResetTarget(null)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReset}
                  disabled={resetSubmitting}
                  className="px-6 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {resetSubmitting ? "Resetting…" : "Reset Votes"}
                </button>
              </div>
            </div>
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
      />
    </div>
  );
}
