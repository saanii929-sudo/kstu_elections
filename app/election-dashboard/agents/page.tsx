"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Trash2, Phone, UserCheck,
  ChevronDown, ChevronUp, RefreshCw, X, CheckCircle, Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";
import ConfirmModal from "@/components/ConfirmModal";

interface Election {
  _id: string;
  title: string;
  settings?: {
    requireAgentSignature?: boolean;
  };
}

interface Candidate {
  _id: string;
  name: string;
  categoryId: { _id: string; name: string } | string;
}

interface AgentCandidate {
  candidateId: string;
  candidateName: string;
  position: string;
}

interface Agent {
  _id: string;
  name: string;
  phone: string;
  candidates: AgentCandidate[];
  createdAt: string;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const colors = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-green-100 text-[#d4af27]", "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  ];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors[name.charCodeAt(0) % colors.length]}`}>
      {initials}
    </div>
  );
}

function getCatId(c: Candidate): string {
  if (!c.categoryId) return "uncategorised";
  return typeof c.categoryId === "string" ? c.categoryId : (c.categoryId._id ?? "uncategorised");
}

function getCatName(c: Candidate): string {
  if (!c.categoryId) return "Uncategorised";
  return typeof c.categoryId === "string" ? "Uncategorised" : (c.categoryId.name ?? "Uncategorised");
}

// ── Add Agent Modal ─────────────────────────────────────────────────────────
function AddAgentModal({
  electionId,
  onClose,
  onSuccess,
}: {
  electionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candidatesError, setCandidatesError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedPositions, setExpandedPositions] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    setCandidatesError("");
    try {
      // Public endpoint — no auth needed
      const res = await fetch(`/api/elections/candidates?electionId=${electionId}`);
      const d = await res.json();
      if (res.ok && d.success) {
        setCandidates(d.data || []);
      } else {
        setCandidatesError(d.error || "Failed to load candidates");
      }
    } catch {
      setCandidatesError("Network error loading candidates");
    } finally {
      setLoadingCandidates(false);
    }
  }, [electionId]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  // Group by position
  const groups = (() => {
    const map = new Map<string, { catId: string; catName: string; items: Candidate[] }>();
    for (const c of candidates) {
      const catId = getCatId(c);
      const catName = getCatName(c);
      if (!map.has(catId)) map.set(catId, { catId, catName, items: [] });
      map.get(catId)!.items.push(c);
    }
    return Array.from(map.values());
  })();

  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = (catId: string) => {
    const ids = candidates.filter((c) => getCatId(c) === catId).map((c) => c._id);
    const allOn = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => allOn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const toggleExpand = (catId: string) =>
    setExpandedPositions((prev) => ({ ...prev, [catId]: !(prev[catId] !== false) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }

    const selectedCandidates: AgentCandidate[] = selectedIds.map((id) => {
      const cand = candidates.find((c) => c._id === id)!;
      return { candidateId: cand._id, candidateName: cand.name, position: getCatName(cand) };
    });

    setSubmitting(true);
    try {
      const res = await authFetch("/api/elections/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          phone: agentPhone.trim(),
          candidates: selectedCandidates,
          electionId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.smsSent
            ? `Agent added — password sent via SMS to ${agentPhone}`
            : "Agent added. SMS failed — check phone number."
        );
        onSuccess();
      } else {
        toast.error(data.error || "Failed to add agent");
      }
    } catch {
      toast.error("Failed to add agent");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">New Agent</p>
            <p className="text-base font-bold text-gray-900">Add Polling Agent</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Agent Name *</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. John Mensah"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Phone * <span className="text-gray-400 font-normal">(password sent via SMS)</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Candidate picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">
                  Assign Candidates *{" "}
                  <span className="text-gray-400 font-normal">({selectedIds.length} selected)</span>
                </label>
                {!loadingCandidates && candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={loadCandidates}
                    className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                )}
              </div>

              {loadingCandidates ? (
                <div className="flex items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl gap-2 text-sm text-gray-400">
                  <RefreshCw size={14} className="animate-spin" /> Loading candidates…
                </div>
              ) : candidatesError ? (
                <div className="py-5 text-center border border-dashed border-red-200 rounded-xl space-y-2">
                  <p className="text-sm text-red-500">{candidatesError}</p>
                  <button type="button" onClick={loadCandidates} className="text-xs text-[#d4af27] underline">
                    Try again
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">
                  No candidates found for this election
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {groups.map(({ catId, catName, items }) => {
                    const isOpen = expandedPositions[catId] !== false;
                    const allSelected = items.every((c) => selectedIds.includes(c._id));
                    return (
                      <div key={catId}>
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                          <button
                            type="button"
                            onClick={() => toggleExpand(catId)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                          >
                            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {catName}
                            <span className="text-xs font-normal text-gray-400">
                              ({items.filter((c) => selectedIds.includes(c._id)).length}/{items.length})
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAll(catId)}
                            className="text-xs text-[#d4af27] font-semibold hover:text-green-900"
                          >
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="divide-y divide-gray-50">
                            {items.map((cand) => {
                              const checked = selectedIds.includes(cand._id);
                              return (
                                <label
                                  key={cand._id}
                                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-green-50 transition ${checked ? "bg-green-50/60" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(cand._id)}
                                    className="accent-[#d4af27] w-4 h-4 shrink-0"
                                  />
                                  <Avatar name={cand.name} />
                                  <span className="text-sm text-gray-800 flex-1">{cand.name}</span>
                                  {checked && <CheckCircle size={14} className="text-[#d4af37] shrink-0" />}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-[#d4af27] text-white text-sm font-semibold rounded-lg hover:bg-[#d4af37] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><RefreshCw size={14} className="animate-spin" /> Adding…</>
              ) : (
                <><Shield size={14} /> Add Agent & Send Password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ agentId: string; name: string } | null>(null);

  const fetchElections = useCallback(async () => {
    try {
      const res = await authFetch("/api/elections");
      if (res.ok) {
        const data = await res.json();
        const all: Election[] = data.data || [];
        // Only elections with "Require Agent Signature" enabled can have agents assigned.
        const list = all.filter((e) => e.settings?.requireAgentSignature);
        setElections(list);
        if (list.length > 0) setSelectedElection(list[0]._id);
        else setSelectedElection("");
      }
    } catch { /* silent */ }
  }, []);

  const fetchAgents = useCallback(async (electionId: string) => {
    if (!electionId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/elections/agents?electionId=${electionId}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.data || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchElections(); }, [fetchElections]);
  useEffect(() => { if (selectedElection) fetchAgents(selectedElection); }, [selectedElection, fetchAgents]);

  const handleDelete = async (agentId: string) => {
    try {
      const res = await authFetch(`/api/elections/agents?agentId=${agentId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Agent removed successfully");
        setAgents((prev) => prev.filter((a) => a._id !== agentId));
      } else {
        toast.error("Failed to remove agent");
      }
    } catch {
      toast.error("Failed to remove agent");
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-[#d4af27]" />
            Polling Agents
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign agents to candidates. Each agent receives a unique password via SMS to sign results.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!selectedElection}
          className="flex items-center gap-2 px-4 py-2 bg-[#d4af27] text-white text-sm font-semibold rounded-lg hover:bg-[#d4af37] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Add Agent
        </button>
      </div>

      {/* Election selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Select Election
        </label>
        <select
          value={selectedElection}
          onChange={(e) => setSelectedElection(e.target.value)}
          disabled={elections.length === 0}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d4af37] bg-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {elections.length === 0 && <option value="">No eligible elections</option>}
          {elections.map((e) => (
            <option key={e._id} value={e._id}>{e.title}</option>
          ))}
        </select>
        {elections.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">
            No elections have &quot;Require Agent Signature&quot; enabled. Turn it on in an election&apos;s
            settings to assign polling agents to it.
          </p>
        )}
      </div>

      {/* Agents list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <UserCheck size={16} className="text-[#d4af27]" />
              Registered Agents
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{agents.length} agent(s)</p>
          </div>
          <button
            onClick={() => fetchAgents(selectedElection)}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#d4af27] rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">No agents yet</p>
            <p className="text-sm text-gray-400">Click "Add Agent" to register your first polling agent.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {agents.map((agent) => (
              <div key={agent._id} className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50 transition">
                <Avatar name={agent.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{agent.name}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={11} /> {agent.phone}
                    </span>
                    <span className="text-xs text-gray-400">
                      Added {new Date(agent.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agent.candidates.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-green-50 text-[#d4af37] border border-green-100"
                      >
                        {c.candidateName}
                        <span className="text-[#d4af37] opacity-70 ml-0.5">({c.position})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm({ agentId: agent._id, name: agent.name })}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                  title="Remove agent"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.agentId)}
        title="Remove Agent"
        message={`Are you sure you want to remove "${deleteConfirm?.name}"? This agent will lose access to sign candidate forms and cannot be undone.`}
        confirmText="Yes, Remove"
        cancelText="Keep Agent"
        type="danger"
      />

      {/* Add Agent Modal */}
      {showModal && selectedElection && (
        <AddAgentModal
          electionId={selectedElection}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchAgents(selectedElection);
          }}
        />
      )}
    </div>
  );
}
