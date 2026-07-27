"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Download,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  BarChart3,
  ClipboardList,
  Shield,
  RefreshCw,
  Users,
  TrendingUp,
  AlertCircle,
  Search,
  PenLine,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";
import ConfirmModal from "@/components/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

interface Election {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface VoterActivity {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  voterId?: string;
  token: string;
  hasVoted: boolean;
  votedAt?: string;
  status: string;
  createdAt: string;
}

interface PositionResult {
  position: string;
  totalVotes: number;
  isTied: boolean;
  tiedCount: number;
  candidates: {
    rank: number;
    name: string;
    ballotNumber?: number;
    votes: number;
    percentage: string;
    status: string;
  }[];
}

interface ResultsReport {
  election: { title: string; startDate: string; endDate: string; status: string };
  totalVoters: number;
  votedCount: number;
  turnoutRate: string;
  positions: PositionResult[];
}

type ReportTab = "activity" | "results" | "failed" | "polling" | "ec" | "pinksheet";

// Initials avatar
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-[#D4AF37]",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// Thin progress bar
function MiniBar({ pct, color = "bg-[#D4AF37]" }: { pct: number; color?: string }) {
  return (
    <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// Stat card
function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: any; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Signature pad modal ──────────────────────────────────────────────────────
interface SignaturePadModalProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

function SignaturePadModal({ label, onSave, onClose }: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    e.preventDefault();
    drawing.current = true;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    e.preventDefault();
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  }, []);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);
    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  const handleClear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PenLine size={16} className="text-gray-600" />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Electronic Signature</p>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="p-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              className="w-full cursor-crosshair touch-none block"
              style={{ height: '160px' }}
            />
            {!hasStrokes && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-gray-300 select-none">Draw your signature here</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Use your mouse or finger to draw your signature above</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition"
          >
            <Trash2 size={14} /> Clear
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasStrokes}
              className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Signature field (inline) ──────────────────────────────────────────────────
function SignatureField({
  fieldKey, label, signatures, onSign,
}: {
  fieldKey: string;
  label?: string;
  signatures: Record<string, string>;
  onSign: (key: string, label: string) => void;
}) {
  const saved = signatures[fieldKey];
  return (
    <div className="flex flex-col gap-1 flex-1">
      {saved ? (
        <div className="relative group border border-gray-200 rounded-lg bg-white px-2 py-1 inline-flex items-center">
          <img src={saved} alt="Signature" className="h-10 max-w-full object-contain" />
          <button
            onClick={() => onSign(fieldKey, label || 'Signature')}
            className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 bg-white rounded px-1"
          >
            <PenLine size={11} /> Edit
          </button>
        </div>
      ) : (
        <button
          onClick={() => onSign(fieldKey, label || 'Signature')}
          className="flex items-center gap-2 text-left group"
        >
          <span className="border-b-2 border-dashed border-gray-300 group-hover:border-[#D4AF37] transition-colors w-52 h-6 inline-block" />
          <span className="text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors flex items-center gap-1">
            <PenLine size={12} /> Sign
          </span>
        </button>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("activity");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [activityData, setActivityData] = useState<VoterActivity[]>([]);
  const [resultsData, setResultsData] = useState<ResultsReport | null>(null);
  const [failedData, setFailedData] = useState<VoterActivity[]>([]);

  // Electronic signatures for pink sheet — persisted to database
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [sigModal, setSigModal] = useState<{ key: string; label: string } | null>(null);
  const [pinkSheetDates, setPinkSheetDates] = useState<Record<string, string>>({});
  const [tiebreakerDecisions, setTiebreakerDecisions] = useState<Record<string, string>>({});
  const [pinkSheetSaving, setPinkSheetSaving] = useState(false);
  const [showClearSigsModal, setShowClearSigsModal] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agent password verification before signature pad
  const [agentPwdModal, setAgentPwdModal] = useState<{
    key: string;
    label: string;
    candidateName: string;
    position: string;
  } | null>(null);
  const [agentPwdInput, setAgentPwdInput] = useState("");
  const [agentPwdError, setAgentPwdError] = useState("");
  const [agentPwdVerifying, setAgentPwdVerifying] = useState(false);

  // Load signatures + dates + decisions from DB when election changes
  useEffect(() => {
    if (!selectedElection) return;
    setSignatures({});
    setPinkSheetDates({});
    setTiebreakerDecisions({});
    authFetch(`/api/elections/pinksheet?electionId=${selectedElection}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          setSignatures(data.data.signatures || {});
          setPinkSheetDates(data.data.dates || {});
          setTiebreakerDecisions(data.data.decisions || {});
        }
      })
      .catch(() => {});
  }, [selectedElection]);

  // Debounced save to DB whenever signatures, dates, or decisions change
  const savePinkSheet = useCallback((sigs: Record<string, string>, dates: Record<string, string>, decisions: Record<string, string>) => {
    if (!selectedElection) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setPinkSheetSaving(true);
      try {
        await authFetch('/api/elections/pinksheet', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ electionId: selectedElection, signatures: sigs, dates, decisions }),
        });
      } catch {}
      finally { setPinkSheetSaving(false); }
    }, 800);
  }, [selectedElection]);

  const openSigModal = useCallback((key: string, label: string) => {
    setSigModal({ key, label });
  }, []);

  // Intercept agent signature requests — require password first
  const handleAgentSign = useCallback((key: string, label: string, candidateName: string, position: string) => {
    setAgentPwdInput("");
    setAgentPwdError("");
    setAgentPwdModal({ key, label, candidateName, position });
  }, []);

  const handleVerifyAgentPassword = useCallback(async () => {
    if (!agentPwdModal || !agentPwdInput.trim()) {
      setAgentPwdError("Please enter the agent password");
      return;
    }
    setAgentPwdVerifying(true);
    setAgentPwdError("");
    try {
      const res = await fetch("/api/elections/agents/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: selectedElection,
          candidateName: agentPwdModal.candidateName,
          position: agentPwdModal.position,
          password: agentPwdInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const { key, label } = agentPwdModal;
        setAgentPwdModal(null);
        setSigModal({ key, label });
      } else {
        setAgentPwdError(data.error === "No agent assigned to this candidate" ? "No agent is assigned to this candidate" : "Incorrect password");
      }
    } catch {
      setAgentPwdError("Verification failed. Please try again.");
    } finally {
      setAgentPwdVerifying(false);
    }
  }, [agentPwdModal, agentPwdInput, selectedElection]);

  const handleSaveSignature = useCallback((dataUrl: string) => {
    if (!sigModal) return;
    setSignatures(prev => {
      const next = { ...prev, [sigModal.key]: dataUrl };
      savePinkSheet(next, pinkSheetDates, tiebreakerDecisions);
      return next;
    });
    setSigModal(null);
    toast.success('Signature saved');
  }, [sigModal, pinkSheetDates, tiebreakerDecisions, savePinkSheet]);

  const handleDateChange = useCallback((position: string, value: string) => {
    setPinkSheetDates(prev => {
      const next = { ...prev, [position]: value };
      savePinkSheet(signatures, next, tiebreakerDecisions);
      return next;
    });
  }, [signatures, tiebreakerDecisions, savePinkSheet]);

  const handleTiebreakerDecisionChange = useCallback((position: string, value: string) => {
    setTiebreakerDecisions(prev => {
      const next = { ...prev, [position]: value };
      savePinkSheet(signatures, pinkSheetDates, next);
      return next;
    });
  }, [signatures, pinkSheetDates, savePinkSheet]);

  useEffect(() => { fetchElections(); }, []);
  useEffect(() => {
    if (!selectedElection) return;
    // pinksheet, ec, and polling all require the results data
    if (['pinksheet', 'ec', 'polling'].includes(activeTab)) {
      if (!resultsData) loadReport('results');
    } else {
      loadReport(activeTab);
    }
  }, [selectedElection, activeTab]);

  const fetchElections = async () => {
    try {
      const res = await authFetch("/api/elections");
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setElections(list);
        if (list.length > 0) setSelectedElection(list[0]._id);
      }
    } catch (e) { console.error(e); }
  };

  const loadReport = async (type: ReportTab) => {
    if (!selectedElection || !["activity", "results", "failed"].includes(type)) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/elections/reports?electionId=${selectedElection}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "activity") setActivityData(data.data || []);
        else if (type === "results") setResultsData(data.data);
        else if (type === "failed") setFailedData(data.data || []);
      } else {
        toast.error("Failed to load report");
      }
    } catch { toast.error("Failed to load report"); }
    finally { setLoading(false); }
  };

  const currentElection = elections.find((e) => e._id === selectedElection);

  // CSV helpers
  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  const exportActivityCSV = () => {
    downloadCSV(
      [["#", "Name", "Email", "Phone", "Voter ID", "Token", "Voted", "Voted At", "Status", "Registered At"],
       ...activityData.map((v, i) => [String(i + 1), v.name, v.email || "", v.phone || "", v.voterId || "", v.token, v.hasVoted ? "Yes" : "No", v.votedAt ? new Date(v.votedAt).toLocaleString() : "", v.status, new Date(v.createdAt).toLocaleString()])],
      `activity-log-${Date.now()}.csv`
    );
  };

  const exportResultsCSV = () => {
    if (!resultsData) return;
    downloadCSV(
      [["Election", "Total Voters", "Voted", "Turnout %"],
       [resultsData.election.title, String(resultsData.totalVoters), String(resultsData.votedCount), resultsData.turnoutRate + "%"],
       [],
       ["Position", "Rank", "Candidate", "Ballot #", "Votes", "Percentage", "Status"],
       ...resultsData.positions.flatMap((p) => p.candidates.map((c) => [p.position, String(c.rank), c.name, String(c.ballotNumber || ""), String(c.votes), c.percentage + "%", c.status]))],
      `election-results-${Date.now()}.csv`
    );
  };

  const exportFailedCSV = () => {
    downloadCSV(
      [["#", "Name", "Email", "Phone", "Voter ID", "Token", "Status", "Registered At"],
       ...failedData.map((v, i) => [String(i + 1), v.name, v.email || "", v.phone || "", v.voterId || "", v.token, v.status, new Date(v.createdAt).toLocaleString()])],
      `non-voters-${Date.now()}.csv`
    );
  };

  const exportPollingAgent = () => {
    if (!resultsData) return;
    const now = new Date().toLocaleString();
    const electionTitle = resultsData.election.title;

    // Check if any polling signatures exist
    const hasSigs = resultsData.positions.some((p) =>
      p.candidates.some((c) => !!signatures[`polling_agent_${p.position}_${c.name}`]) ||
      !!signatures[`polling_officer_${p.position}`]
    );

    if (hasSigs) {
      // ── PDF via print ──
      const positionsHTML = resultsData.positions.map((p) => {
        const rows = p.candidates.map((c) => {
          const sigKey = `polling_agent_${p.position}_${c.name}`;
          const sig = signatures[sigKey];
          const sigCell = sig
            ? `<img src="${sig}" style="height:44px;max-width:200px;object-fit:contain;display:block;" />`
            : `<span style="display:inline-block;width:200px;border-bottom:1.5px dashed #d1d5db;">&nbsp;</span>`;
          const statusColor = c.status === 'Elected' ? '#15803d' : c.status === 'Tied' ? '#92400e' : c.status === 'Leading' ? '#1d4ed8' : '#6b7280';
          return `<tr>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">${c.name}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-family:monospace;">${c.ballotNumber || '—'}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;font-size:15px;">${c.votes}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;text-align:center;">${c.percentage}%</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;font-weight:600;color:${statusColor};">${c.status}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f3f4f6;">${sigCell}</td>
          </tr>`;
        }).join('');
        const officerKey = `polling_officer_${p.position}`;
        const officerSig = signatures[officerKey];
        const officerCell = officerSig
          ? `<img src="${officerSig}" style="height:44px;max-width:200px;object-fit:contain;display:inline-block;" />`
          : `<span style="display:inline-block;width:200px;border-bottom:1.5px dashed #d1d5db;">&nbsp;</span>`;
        const dateVal = pinkSheetDates[`polling_${p.position}`] || '_______________';
        return `
          <div style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
            <div style="background:#15803d;color:#fff;padding:11px 18px;display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:14px;">${p.position}</strong>
              <span style="font-size:12px;opacity:0.85;">${p.totalVotes} total votes</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="text-align:left;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Candidate</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Ballot #</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Votes</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">%</th>
                <th style="text-align:left;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Status</th>
                <th style="text-align:left;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Agent Signature</th>
              </tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr style="background:#f3f4f6;border-top:2px solid #e5e7eb;">
                <td style="padding:9px 14px;font-weight:700;font-size:12px;text-transform:uppercase;">Total</td>
                <td></td><td style="padding:9px 14px;text-align:center;font-weight:700;">${p.totalVotes}</td>
                <td></td><td></td><td></td>
              </tr></tfoot>
            </table>
            <div style="padding:12px 18px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;flex-wrap:wrap;align-items:center;gap:20px;font-size:13px;">
              <span style="font-weight:600;">Presiding Officer:</span>${officerCell}
              <span style="margin-left:8px;font-weight:600;">Date:</span><span>${dateVal}</span>
            </div>
          </div>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Polling Agent Report — ${electionTitle}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #111827; max-width: 860px; margin: 36px auto; padding: 0 24px; }
          @media print { body { margin: 0; } @page { margin: 20mm; } }
        </style></head><body>
        <div style="border-bottom:3px solid #15803d;padding-bottom:14px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
              <p style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Polling Agent Report</p>
              <h1 style="font-size:20px;font-weight:800;color:#111827;">${electionTitle}</h1>
              <p style="font-size:12px;color:#6b7280;margin-top:4px;">Period: ${new Date(resultsData.election.startDate).toLocaleDateString()} – ${new Date(resultsData.election.endDate).toLocaleDateString()} &nbsp;|&nbsp; Status: ${resultsData.election.status}</p>
            </div>
            <div style="text-align:right;font-size:12px;color:#9ca3af;">
              <div>Registered Voters: <strong style="color:#111827;">${resultsData.totalVoters}</strong></div>
              <div>Votes Cast: <strong style="color:#111827;">${resultsData.votedCount}</strong></div>
              <div>Turnout: <strong style="color:#111827;">${resultsData.turnoutRate}%</strong></div>
            </div>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin-top:8px;">Generated: ${now}</p>
        </div>
        ${positionsHTML}
        <p style="font-size:11px;color:#9ca3af;margin-top:28px;text-align:center;border-top:1px solid #f3f4f6;padding-top:12px;">
          This is an official election document generated by Pawavotes Election System. Unauthorized alteration is prohibited.
        </p>
      </body></html>`;

      const pw = window.open('', '_blank', 'width=960,height=720');
      if (!pw) { toast.error('Allow pop-ups to export PDF'); return; }
      pw.document.write(html);
      pw.document.close();
      pw.onload = () => { pw.focus(); pw.print(); };
      toast.success('Print dialog opened — save as PDF');
    } else {
      // ── CSV fallback (no signatures) ──
      const rows: string[][] = [
        ["POLLING AGENT REPORT"],
        [`Election: ${electionTitle}`],
        [`Election Period: ${new Date(resultsData.election.startDate).toLocaleString()} – ${new Date(resultsData.election.endDate).toLocaleString()}`],
        [`Election Status: ${resultsData.election.status}`],
        [`Generated: ${now}`],
        [],
        ["SUMMARY"],
        ["Total Registered Voters", String(resultsData.totalVoters)],
        ["Total Votes Cast", String(resultsData.votedCount)],
        ["Did Not Vote", String(resultsData.totalVoters - resultsData.votedCount)],
        ["Voter Turnout", `${resultsData.turnoutRate}%`],
        [],
      ];
      resultsData.positions.forEach((p) => {
        rows.push([`POSITION: ${p.position}`, `Total Votes: ${p.totalVotes}`]);
        if (p.isTied) rows.push([`NOTE: Dead Heat — ${p.tiedCount} candidates tied. A tiebreaker process is required.`]);
        rows.push(["Candidate", "Ballot #", "Votes", "Percentage", "Status"]);
        p.candidates.forEach((c) => rows.push([c.name, String(c.ballotNumber || "—"), String(c.votes), `${c.percentage}%`, c.status]));
        rows.push([]);
      });
      rows.push(["Report prepared by Pawavotes Election System"]);
      rows.push([`Export Date: ${now}`]);
      downloadCSV(rows, `polling-agent-report-${Date.now()}.csv`);
    }
  };

  const exportECReportCSV = () => {
    if (!resultsData) return;
    downloadCSV(
      [[`ELECTORAL COMMISSION REPORT`], [`Election: ${resultsData.election.title}`],
       [`Period: ${new Date(resultsData.election.startDate).toLocaleString()} – ${new Date(resultsData.election.endDate).toLocaleString()}`],
       [`Status: ${resultsData.election.status}`], [],
       [`SUMMARY`],
       ["Total Registered Voters", String(resultsData.totalVoters)],
       ["Total Votes Cast", String(resultsData.votedCount)],
       ["Did Not Vote", String(resultsData.totalVoters - resultsData.votedCount)],
       ["Voter Turnout", resultsData.turnoutRate + "%"], [],
       [`ELECTION RESULTS BY POSITION`], [],
       ...resultsData.positions.flatMap((p) => [
         [`Position: ${p.position} (Total Votes: ${p.totalVotes})`],
         ["Rank", "Candidate", "Votes", "Percentage", "Status"],
         ...p.candidates.map((c) => [String(c.rank), c.name, String(c.votes), c.percentage + "%", c.status]),
         [],
       ]),
       [], ["Prepared by: Electoral Commission"], [`Date: ${new Date().toLocaleString()}`]],
      `ec-report-${Date.now()}.csv`
    );
  };

  const exportPinkSheet = () => {
    if (!resultsData) return;
    const now = new Date().toLocaleString();
    const electionTitle = resultsData.election.title;

    // Check if any pink sheet data (signatures or tiebreaker decisions) exists
    const hasSigs = resultsData.positions.some((p) =>
      p.candidates.some((c) => !!signatures[`agent_${p.position}_${c.name}`]) ||
      !!signatures[`officer_${p.position}`] ||
      !!tiebreakerDecisions[p.position]
    );

    if (hasSigs) {
      // ── PDF via print ──
      const positionsHTML = resultsData.positions.map((p) => {
        const rows = p.candidates.map((c) => {
          const sigKey = `agent_${p.position}_${c.name}`;
          const sig = signatures[sigKey];
          const sigCell = sig
            ? `<img src="${sig}" style="height:46px;max-width:210px;object-fit:contain;display:block;" />`
            : `<span style="display:inline-block;width:210px;border-bottom:1.5px dashed #d1d5db;">&nbsp;</span>`;
          const isWinner = c.status === 'Elected' || c.status === 'Leading';
          const isTied = c.status === 'Tied';
          const rowBg = isTied ? '#fffbeb' : isWinner ? '#f0fdf4' : '#fff';
          const badge = isTied
            ? `<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:6px;">Tied</span>`
            : isWinner
            ? `<span style="background:#15803d;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:6px;">${c.status}</span>`
            : '';
          return `<tr style="background:${rowBg};">
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-family:monospace;color:#6b7280;">${c.rank}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;font-weight:600;">${c.name}${badge}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-family:monospace;">${c.ballotNumber || '—'}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:16px;font-weight:700;">${c.votes}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;text-align:center;">${c.percentage}%</td>
            <td style="padding:12px 14px;border-bottom:1px solid #f3f4f6;">${sigCell}</td>
          </tr>`;
        }).join('');

        const officerKey = `officer_${p.position}`;
        const officerSig = signatures[officerKey];
        const officerCell = officerSig
          ? `<img src="${officerSig}" style="height:46px;max-width:210px;object-fit:contain;display:inline-block;" />`
          : `<span style="display:inline-block;width:210px;border-bottom:1.5px dashed #d1d5db;">&nbsp;</span>`;
        const dateVal = pinkSheetDates[p.position] || '_______________';

        const tiebreakerSection = p.isTied ? (() => {
          const tbDecision = tiebreakerDecisions[p.position];
          const tbContent = tbDecision
            ? `<p style="font-size:13px;color:#78350f;margin:0;white-space:pre-wrap;">${tbDecision}</p>`
            : `<p style="font-size:13px;color:#b45309;margin:0;font-style:italic;">No decision recorded.</p>`;
          return `<div style="padding:12px 18px;background:#fffbeb;border-top:2px solid #f59e0b;">
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#92400e;letter-spacing:.05em;">Tiebreaker Decision</span>
            <div style="margin-top:8px;">${tbContent}</div>
          </div>`;
        })() : '';

        return `
          <div style="margin-bottom:28px;border:2px solid #e5e7eb;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
            <div style="background:#111827;color:#fff;padding:11px 18px;text-align:center;">
              <p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:3px;">Position</p>
              <h3 style="font-size:15px;font-weight:700;">${p.position}</h3>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f3f4f6;border-bottom:2px solid #e5e7eb;">
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">#</th>
                <th style="text-align:left;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Candidate</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Ballot</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Votes</th>
                <th style="text-align:center;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">%</th>
                <th style="text-align:left;padding:9px 14px;font-size:11px;color:#6b7280;text-transform:uppercase;">Agent Signature</th>
              </tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr style="background:#f3f4f6;border-top:2px solid #e5e7eb;">
                <td colspan="3" style="padding:9px 14px;font-weight:700;font-size:12px;text-transform:uppercase;">Total Votes</td>
                <td style="padding:9px 14px;text-align:center;font-size:17px;font-weight:700;">${p.totalVotes}</td>
                <td colspan="2"></td>
              </tr></tfoot>
            </table>
            ${tiebreakerSection}
            <div style="padding:13px 18px;background:#f9fafb;border-top:2px solid #e5e7eb;display:flex;flex-wrap:wrap;align-items:center;gap:18px;font-size:13px;">
              <span style="font-weight:600;">Presiding Officer:</span>${officerCell}
              <span style="font-weight:600;margin-left:6px;">Date:</span><span>${dateVal}</span>
            </div>
          </div>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Pink Sheet — ${electionTitle}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #111827; max-width: 860px; margin: 36px auto; padding: 0 24px; }
          @media print { body { margin: 0; } @page { margin: 20mm; } }
        </style></head><body>
        <div style="border-bottom:3px solid #15803d;padding-bottom:16px;margin-bottom:28px;text-align:center;">
          <p style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Official Election Document</p>
          <h1 style="font-size:22px;font-weight:800;color:#111827;">PINK SHEET</h1>
          <h2 style="font-size:16px;font-weight:600;color:#374151;margin-top:4px;">${electionTitle}</h2>
          <div style="display:flex;justify-content:center;gap:28px;font-size:13px;color:#6b7280;margin-top:10px;">
            <span>Registered Voters: <strong style="color:#111827;">${resultsData.totalVoters}</strong></span>
            <span>Votes Cast: <strong style="color:#111827;">${resultsData.votedCount}</strong></span>
            <span>Turnout: <strong style="color:#111827;">${resultsData.turnoutRate}%</strong></span>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin-top:8px;">Generated: ${now}</p>
        </div>
        ${positionsHTML}
        <p style="font-size:11px;color:#9ca3af;margin-top:28px;text-align:center;border-top:1px solid #f3f4f6;padding-top:12px;">
          This is an official election document generated by Pawavotes Election System. Unauthorized alteration is prohibited.
        </p>
      </body></html>`;

      const pw = window.open('', '_blank', 'width=960,height=720');
      if (!pw) { toast.error('Allow pop-ups to export PDF'); return; }
      pw.document.write(html);
      pw.document.close();
      pw.onload = () => { pw.focus(); pw.print(); };
      toast.success('Print dialog opened — save as PDF');
    } else {
      // ── CSV fallback (no signatures) ──
      const rows: string[][] = [
        ["OFFICIAL PINK SHEET"],
        [`Election: ${electionTitle}`],
        [`Election Period: ${new Date(resultsData.election.startDate).toLocaleString()} – ${new Date(resultsData.election.endDate).toLocaleString()}`],
        [`Election Status: ${resultsData.election.status}`],
        [`Generated: ${now}`],
        [],
        ["ELECTION SUMMARY"],
        ["Total Registered Voters", String(resultsData.totalVoters)],
        ["Total Votes Cast", String(resultsData.votedCount)],
        ["Did Not Vote", String(resultsData.totalVoters - resultsData.votedCount)],
        ["Voter Turnout", `${resultsData.turnoutRate}%`],
        [],
        ["RESULTS BY POSITION"],
        [],
      ];
      resultsData.positions.forEach((p) => {
        rows.push([`POSITION: ${p.position}`, `Total Votes: ${p.totalVotes}`]);
        if (p.isTied) rows.push([`NOTE: Dead Heat — ${p.tiedCount} candidates tied. A tiebreaker process is required.`]);
        rows.push(["Rank", "Candidate", "Ballot #", "Votes", "Percentage", "Status"]);
        p.candidates.forEach((c) => rows.push([String(c.rank), c.name, String(c.ballotNumber || "—"), String(c.votes), `${c.percentage}%`, c.status]));
        rows.push([]);
      });
      rows.push(["This is an official election document. Unauthorized alteration is prohibited."]);
      rows.push(["Report prepared by Pawavotes Election System"]);
      rows.push([`Export Date: ${now}`]);
      downloadCSV(rows, `pink-sheet-${Date.now()}.csv`);
    }
  };

  const tabs: { id: ReportTab; label: string; icon: any; color: string }[] = [
    { id: "activity",   label: "Activity Log",    icon: Activity,      color: "text-blue-600" },
    { id: "results",    label: "Master Results",   icon: BarChart3,     color: "text-[#D4AF37]" },
    { id: "failed",     label: "Did Not Vote",     icon: XCircle,       color: "text-red-500" },
    { id: "polling",    label: "Polling Agent",    icon: ClipboardList, color: "text-[#D4AF37]" },
    { id: "ec",         label: "EC Report",        icon: Shield,        color: "text-emerald-700" },
    { id: "pinksheet",  label: "Pink Sheet",       icon: FileText,      color: "text-pink-600" },
  ];

  // Filter helpers
  const filteredActivity = activityData.filter((v) =>
    !search || [v.name, v.email, v.phone, v.voterId, v.token].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredFailed = failedData.filter((v) =>
    !search || [v.name, v.email, v.phone, v.voterId, v.token].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const EmptyState = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
    <div className="py-20 flex flex-col items-center gap-3 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Icon size={28} className="text-gray-400" />
      </div>
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 max-w-xs">{body}</p>
    </div>
  );

  const LoadingState = () => (
    <div className="py-20 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#D4AF37] rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading report…</p>
    </div>
  );

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-sm text-gray-500">Generate, review, and export election reports</p>
          </div>
        </div>
      </div>

      {/* Election selector card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Select Election</label>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-gray-50"
          >
            {elections.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>
        {currentElection && (
          <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentElection.status === "active" ? "bg-green-100 text-[#D4AF37]"
              : currentElection.status === "ended" ? "bg-gray-100 text-gray-600"
              : "bg-yellow-100 text-yellow-700"
            }`}>
              {currentElection.status}
            </span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span className="hidden sm:inline">{new Date(currentElection.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        )}
      </div>

      {selectedElection && (
        <>
          {/* Tab navigation */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max px-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                      isActive ? `${tab.color} bg-gray-50` : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ACTIVITY LOG ── */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" />
                    Voting Activity Log
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="text-[#D4AF37] font-semibold">{activityData.filter((v) => v.hasVoted).length} voted</span>
                    {" · "}
                    <span className="text-gray-500">{activityData.filter((v) => !v.hasVoted).length} pending</span>
                    {" · "}
                    {activityData.length} total registered
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search voters…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] w-44"
                    />
                  </div>
                  <button onClick={() => loadReport("activity")} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition" title="Refresh">
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={exportActivityCSV}
                    disabled={activityData.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-white text-sm rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-40"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {loading ? <LoadingState /> : activityData.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" body="Voter activity will appear here once the election begins." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voter</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voter ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Token</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Voted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredActivity.map((v, i) => (
                        <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={v.name} />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                                <p className={`text-xs font-medium mt-0.5 ${v.status === "active" ? "text-blue-500" : v.status === "expired" ? "text-gray-400" : "text-red-500"}`}>
                                  {v.status}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-700 truncate max-w-40">{v.email || v.phone || "—"}</p>
                            {v.email && v.phone && <p className="text-xs text-gray-400 truncate max-w-40">{v.phone}</p>}
                          </td>
                          <td className="py-3 px-4 text-gray-500">{v.voterId || "—"}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v.token}</span>
                          </td>
                          <td className="py-3 px-4">
                            {v.hasVoted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-[#D4AF37] border border-green-200 rounded-full text-xs font-semibold">
                                <CheckCircle size={11} /> Voted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                                <AlertCircle size={11} /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                            {v.votedAt ? new Date(v.votedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredActivity.length === 0 && search && (
                    <div className="py-10 text-center text-sm text-gray-400">No voters match &ldquo;{search}&rdquo;</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MASTER RESULTS ── */}
          {activeTab === "results" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#D4AF37]" />
                  Master General Report
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => loadReport("results")} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition" title="Refresh">
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={exportResultsCSV} disabled={!resultsData} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-white text-sm rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-40">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {loading ? <div className="bg-white rounded-2xl border p-0"><LoadingState /></div> : !resultsData ? (
                <div className="bg-white rounded-2xl border"><EmptyState icon={BarChart3} title="No results yet" body="Results will show once voting begins and candidates receive votes." /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Registered Voters" value={resultsData.totalVoters} icon={Users} accent="bg-blue-50 text-blue-600" />
                    <StatCard label="Votes Cast" value={resultsData.votedCount} icon={CheckCircle} accent="bg-green-50 text-[#D4AF37]" />
                    <StatCard label="Did Not Vote" value={resultsData.totalVoters - resultsData.votedCount} icon={XCircle} accent="bg-orange-50 text-orange-600" />
                    <StatCard label="Voter Turnout" value={resultsData.turnoutRate + "%"} icon={TrendingUp} accent="bg-violet-50 text-violet-600" />
                  </div>

                  {resultsData.positions.map((pos) => (
                    <div key={pos.position} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-3  flex items-center justify-between">
                        <h3 className="font-bold text-black text-sm">{pos.position}</h3>
                        <span className="text-xs text-white bg-[#D4AF37] px-2.5 py-0.5 rounded-full">{pos.totalVotes} votes cast</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ballot #</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Votes</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Share</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {pos.candidates.map((c) => {
                              const isWinner = c.rank === 1 && c.votes > 0;
                              const isSolo = pos.candidates.length === 1;
                              // For solo candidate, show votes relative to total registered voters
                              const displayPct = isSolo && resultsData.totalVoters > 0
                                ? ((c.votes / resultsData.totalVoters) * 100).toFixed(1)
                                : c.percentage;
                              return (
                                <tr key={c.rank} className={`transition-colors ${isWinner ? "bg-green-50 hover:bg-green-100/60" : "hover:bg-gray-50"}`}>
                                  <td className="py-4 px-4">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isWinner ? "bg-[#D4AF37] text-white" : "bg-gray-100 text-gray-600"}`}>
                                      {c.rank}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar name={c.name} />
                                      <div>
                                        <span className="font-semibold text-gray-900">{c.name}</span>
                                        {isSolo && <p className="text-xs text-gray-400 mt-0.5">Voted for this candidate</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-gray-500">{c.ballotNumber || "—"}</td>
                                  <td className="py-4 px-4 font-bold text-gray-900">{c.votes.toLocaleString()}</td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <MiniBar pct={parseFloat(displayPct)} color={isWinner ? "bg-[#D4AF37]" : "bg-gray-300"} />
                                      <span className="text-xs text-gray-600 font-medium w-10">{displayPct}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                      c.status === "Tied" ? "bg-amber-100 text-amber-700 border border-amber-200"
                                      : c.status === "Elected" || (c.status === "Leading" && (resultsData.election.status === "ended" || (currentElection && new Date(currentElection.endDate) < new Date()))) ? "bg-[#D4AF37] text-white"
                                      : c.status === "Leading" ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {c.status === "Leading" && (resultsData.election.status === "ended" || (currentElection && new Date(currentElection.endDate) < new Date())) ? "Elected" : c.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Solo candidate: show "Did Not Vote" row */}
                            {pos.candidates.length === 1 && (() => {
                              const notVotedCount = Math.max(0, resultsData.totalVoters - pos.candidates[0].votes);
                              const notVotedPct = resultsData.totalVoters > 0 ? ((notVotedCount / resultsData.totalVoters) * 100).toFixed(1) : "0.0";
                              return (
                                <tr className="hover:bg-gray-50 border-t-2 border-gray-100">
                                  <td className="py-4 px-4">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
                                      <span className="text-gray-400 text-xs font-bold">—</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <Users size={14} className="text-gray-400" />
                                      </div>
                                      <div>
                                        <span className="font-semibold text-gray-500 italic">Did Not Vote</span>
                                        <p className="text-xs text-gray-400 mt-0.5">Registered voters who abstained</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-gray-400">—</td>
                                  <td className="py-4 px-4 font-bold text-gray-600">{notVotedCount.toLocaleString()}</td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <MiniBar pct={parseFloat(notVotedPct)} color="bg-gray-300" />
                                      <span className="text-xs text-gray-500 font-medium w-10">{notVotedPct}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Abstained</span>
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── DID NOT VOTE ── */}
          {activeTab === "failed" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <XCircle size={18} className="text-red-500" />
                    Voters Who Did Not Vote
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">{failedData.length} voter(s) have not cast a ballot</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] w-40" />
                  </div>
                  <button onClick={() => loadReport("failed")} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
                    <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={exportFailedCSV} disabled={failedData.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-40">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {loading ? <LoadingState /> : failedData.length === 0 ? (
                <EmptyState icon={CheckCircle} title="All voters have voted!" body="Every registered voter has successfully cast their ballot." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voter</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voter ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Token</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredFailed.map((v, i) => (
                        <tr key={v._id} className="hover:bg-red-50/40 transition-colors">
                          <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={v.name} />
                              <p className="font-semibold text-gray-900">{v.name}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-700 truncate max-w-40">{v.email || v.phone || "—"}</p>
                            {v.email && v.phone && <p className="text-xs text-gray-400">{v.phone}</p>}
                          </td>
                          <td className="py-3 px-4 text-gray-500">{v.voterId || "—"}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{v.token}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredFailed.length === 0 && search && (
                    <div className="py-10 text-center text-sm text-gray-400">No voters match &ldquo;{search}&rdquo;</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── POLLING AGENT ── */}
          {activeTab === "polling" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#D4AF37]" />
                    Polling Agent Report
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(() => {
                      const hasSigs = resultsData?.positions.some((p) =>
                        p.candidates.some((c) => !!signatures[`polling_agent_${p.position}_${c.name}`]) ||
                        !!signatures[`polling_officer_${p.position}`]
                      );
                      return hasSigs
                        ? "Signatures detected — export will open a print dialog so you can save as PDF."
                        : "No signatures yet — export will download as CSV. Sign fields to enable PDF export.";
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => { if (!resultsData) { loadReport("results"); setTimeout(exportPollingAgent, 800); } else { exportPollingAgent(); } }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-white text-sm rounded-lg hover:bg-[#D4AF37] transition"
                >
                  {(() => {
                    const hasSigs = resultsData?.positions.some((p) =>
                      p.candidates.some((c) => !!signatures[`polling_agent_${p.position}_${c.name}`]) ||
                      !!signatures[`polling_officer_${p.position}`]
                    );
                    return <><Download size={14} /> {hasSigs ? "Export PDF" : "Export CSV"}</>;
                  })()}
                </button>
              </div>

              <div className="p-6">
                {!resultsData ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-[#D4AF37] rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading polling agent report…</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {resultsData.positions.map((pos) => (
                      <div key={pos.position} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className=" px-5 py-3 flex items-center justify-between">
                          <h3 className="font-bold text-black text-sm">{pos.position}</h3>
                          <span className="text-xs text-black">{pos.totalVotes} total votes</span>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-140">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              {["Candidate", "Ballot #", "Votes", "Agent Signature"].map((h) => (
                                <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {pos.candidates.map((c) => (
                              <tr key={c.rank} className="hover:bg-gray-50">
                                <td className="py-5 px-5">
                                  <div className="flex items-center gap-3">
                                    <Avatar name={c.name} />
                                    <span className="font-medium text-gray-900">{c.name}</span>
                                  </div>
                                </td>
                                <td className="py-5 px-5 text-gray-500">{c.ballotNumber || "—"}</td>
                                <td className="py-5 px-5 font-bold text-[#D4AF37]">{c.votes}</td>
                                <td className="py-5 px-5">
                                  <SignatureField
                                    fieldKey={`polling_agent_${pos.position}_${c.name}`}
                                    label={`${c.name} — Agent Signature (${pos.position})`}
                                    signatures={signatures}
                                    onSign={(key, label) => handleAgentSign(key, label, c.name, pos.position)}
                                  />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                              <td className="py-3 px-5 font-bold text-gray-800 text-sm">Total</td>
                              <td />
                              <td className="py-3 px-5 font-bold text-[#D4AF37]">{pos.totalVotes}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-4">
                          <span className="font-semibold text-sm text-gray-700 shrink-0">Presiding Officer:</span>
                          <SignatureField
                            fieldKey={`polling_officer_${pos.position}`}
                            label={`Presiding Officer — ${pos.position}`}
                            signatures={signatures}
                            onSign={openSigModal}
                          />
                          <span className="font-semibold text-sm text-gray-700 shrink-0 ml-2">Date:</span>
                          <input
                            type="date"
                            value={pinkSheetDates[`polling_${pos.position}`] || ''}
                            onChange={e => handleDateChange(`polling_${pos.position}`, e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EC REPORT ── */}
          {activeTab === "ec" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Shield size={18} className="text-emerald-700" />
                    Electoral Commission Report
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Official EC summary for certification and records.</p>
                </div>
                <button
                  onClick={() => { loadReport("results"); setTimeout(exportECReportCSV, 600); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-800 transition"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="p-6">
                {!resultsData ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-700 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading EC report…</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard label="Registered Voters" value={resultsData.totalVoters} icon={Users} accent="bg-blue-50 text-blue-600" />
                      <StatCard label="Total Votes Cast" value={resultsData.votedCount} icon={CheckCircle} accent="bg-green-50 text-[#D4AF37]" />
                      <StatCard label="Did Not Vote" value={resultsData.totalVoters - resultsData.votedCount} icon={XCircle} accent="bg-red-50 text-red-500" />
                      <StatCard label="Voter Turnout" value={resultsData.turnoutRate + "%"} icon={TrendingUp} accent="bg-violet-50 text-violet-600" />
                    </div>

                    {/* Per-position EC table */}
                    {resultsData.positions.map((pos) => (
                      <div key={pos.position} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className=" px-5 py-3 flex items-center justify-between">
                          <h3 className="font-bold text-black text-sm">{pos.position}</h3>
                          <span className="text-xs text-black">{pos.totalVotes} votes</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              {["Rank", "Candidate", "Votes", "Share", "Declared Result"].map((h) => (
                                <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {pos.candidates.map((c) => {
                              const isWinner = c.rank === 1 && c.votes > 0;
                              const isSolo = pos.candidates.length === 1;
                              const displayPct = isSolo && resultsData.totalVoters > 0
                                ? ((c.votes / resultsData.totalVoters) * 100).toFixed(1)
                                : c.percentage;
                              return (
                                <tr key={c.rank} className={isWinner ? "bg-emerald-50" : "hover:bg-gray-50"}>
                                  <td className="py-4 px-5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isWinner ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                                      {c.rank}
                                    </div>
                                  </td>
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-3">
                                      <Avatar name={c.name} />
                                      <div>
                                        <span className="font-semibold text-gray-900">{c.name}</span>
                                        {isSolo && <p className="text-xs text-gray-400 mt-0.5">Voted for this candidate</p>}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5 font-bold text-gray-900">{c.votes.toLocaleString()}</td>
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-2">
                                      <MiniBar pct={parseFloat(displayPct)} color={isWinner ? "bg-emerald-500" : "bg-gray-300"} />
                                      <span className="text-xs text-gray-600 w-10">{displayPct}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                      c.status === "Tied" ? "bg-amber-100 text-amber-700 border border-amber-200"
                                      : c.status === "Elected" || (c.status === "Leading" && (resultsData.election.status === "ended" || (currentElection && new Date(currentElection.endDate) < new Date()))) ? "bg-emerald-600 text-white"
                                      : c.status === "Leading" ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {c.status === "Leading" && (resultsData.election.status === "ended" || (currentElection && new Date(currentElection.endDate) < new Date())) ? "Elected" : c.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Solo candidate: "Did Not Vote" row */}
                            {pos.candidates.length === 1 && (() => {
                              const notVotedCount = Math.max(0, resultsData.totalVoters - pos.candidates[0].votes);
                              const notVotedPct = resultsData.totalVoters > 0 ? ((notVotedCount / resultsData.totalVoters) * 100).toFixed(1) : "0.0";
                              return (
                                <tr className="hover:bg-gray-50 border-t-2 border-gray-100">
                                  <td className="py-4 px-5">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100">
                                      <span className="text-gray-400 text-xs font-bold">—</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <Users size={14} className="text-gray-400" />
                                      </div>
                                      <div>
                                        <span className="font-semibold text-gray-500 italic">Did Not Vote</span>
                                        <p className="text-xs text-gray-400 mt-0.5">Registered voters who abstained</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5 font-bold text-gray-600">{notVotedCount.toLocaleString()}</td>
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-2">
                                      <MiniBar pct={parseFloat(notVotedPct)} color="bg-gray-300" />
                                      <span className="text-xs text-gray-500 w-10">{notVotedPct}%</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-5">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Abstained</span>
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
                      <Shield size={12} />
                      Certified by Electoral Commission · Generated {new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PINK SHEET ── */}
          {activeTab === "pinksheet" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <FileText size={18} className="text-pink-600" />
                    Pink Sheet
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {Object.keys(signatures).length > 0
                      ? "Signatures detected — export will open a print dialog so you can save as PDF."
                      : "No signatures yet — export will download as CSV. Sign fields to enable PDF export."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pinkSheetSaving && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" /> Saving…
                    </span>
                  )}
                  {Object.keys(signatures).length > 0 && (
                    <button
                      onClick={() => setShowClearSigsModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-red-600 hover:border-red-200 transition"
                    >
                      <Trash2 size={14} /> Clear Signatures
                    </button>
                  )}
                  <button
                    onClick={() => { if (!resultsData) { loadReport("results"); setTimeout(exportPinkSheet, 800); } else { exportPinkSheet(); } }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition"
                  >
                    <Download size={14} /> {Object.keys(signatures).length > 0 ? "Export PDF" : "Export CSV"}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!resultsData ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading pink sheet…</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Election meta */}
                    <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-5">
                      <p className="text-xs font-semibold text-pink-500 uppercase tracking-wide mb-2">Election Details</p>
                      <h3 className="font-bold text-lg text-gray-900 mb-4">{currentElection?.title}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-xs text-gray-500 mb-1">Start Date</p><p className="font-semibold text-gray-800">{currentElection && new Date(currentElection.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                        <div><p className="text-xs text-gray-500 mb-1">End Date</p><p className="font-semibold text-gray-800">{currentElection && new Date(currentElection.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                        <div><p className="text-xs text-gray-500 mb-1">Total Registered</p><p className="font-bold text-xl text-gray-900">{resultsData.totalVoters}</p></div>
                        <div><p className="text-xs text-gray-500 mb-1">Total Votes Cast</p><p className="font-bold text-xl text-gray-900">{resultsData.votedCount}</p></div>
                      </div>
                    </div>

                    {/* Per-position pink sheets */}
                    {resultsData.positions.map((pos) => (
                      <div key={pos.position} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                        <div className=" text-black px-6 py-3 text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Position</p>
                          <h3 className="font-bold text-base tracking-wide">{pos.position}</h3>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-150">
                          <thead className="bg-gray-100 border-b-2 border-gray-200">
                            <tr>
                              <th className="text-left py-3 px-4 font-bold text-gray-700">Candidate</th>
                              <th className="text-center py-3 px-3 font-bold text-gray-700">Ballot #</th>
                              <th className="text-center py-3 px-3 font-bold text-gray-700">Votes</th>
                              <th className="text-left py-3 px-4 font-bold text-gray-700">Agent Signature</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pos.candidates.map((c) => {
                              const isTiedCandidate = c.status === 'Tied';
                              const isWinner = c.status === 'Elected' || c.status === 'Leading';
                              return (
                                <tr
                                  key={c.rank}
                                  className={
                                    isTiedCandidate ? 'bg-amber-50' :
                                    isWinner ? 'bg-pink-50' : 'bg-white'
                                  }
                                >
                                  <td className="py-6 px-6">
                                    <div className="flex items-center gap-3">
                                      <Avatar name={c.name} />
                                      <span className="font-semibold text-gray-900">{c.name}</span>
                                      {isTiedCandidate && (
                                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                          Tied
                                        </span>
                                      )}
                                      {isWinner && (
                                        <span className="text-xs bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full">
                                          {c.status === 'Elected' ? 'Winner' : 'Leading'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-6 px-4 text-center font-mono font-semibold text-gray-700">{c.ballotNumber || "—"}</td>
                                  <td className="py-6 px-4 text-center font-bold text-xl text-gray-900">{c.votes}</td>
                                  <td className="py-5 px-6">
                                    <SignatureField
                                      fieldKey={`agent_${pos.position}_${c.name}`}
                                      label={`${c.name} — Agent Signature`}
                                      signatures={signatures}
                                      onSign={(key, label) => handleAgentSign(key, label, c.name, pos.position)}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gray-100 border-t-2 border-gray-300">
                              <td className="py-4 px-6 font-bold text-gray-900 uppercase tracking-wide text-sm">Total Votes</td>
                              <td />
                              <td className="py-4 px-4 text-center font-bold text-2xl text-gray-900">{pos.totalVotes}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                        </div>

                        {/* Tiebreaker decision when tied */}
                        {pos.isTied && (
                          <div className="px-6 py-4 bg-amber-50 border-t-2 border-amber-200">
                            <label className="block text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                              Tiebreaker Decision
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Enter the official tiebreaker decision here (e.g. method used, outcome, presiding officer's ruling)…"
                              value={tiebreakerDecisions[pos.position] || ''}
                              onChange={(e) => handleTiebreakerDecisionChange(pos.position, e.target.value)}
                              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder:text-gray-400"
                            />
                          </div>
                        )}

                        <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex flex-wrap items-center gap-4">
                          <span className="font-bold text-gray-700 text-sm shrink-0">Presiding Officer:</span>
                          <SignatureField
                            fieldKey={`officer_${pos.position}`}
                            label={`Presiding Officer — ${pos.position}`}
                            signatures={signatures}
                            onSign={openSigModal}
                          />
                          <span className="font-bold text-gray-700 text-sm shrink-0 ml-2">Date:</span>
                          <input
                            type="date"
                            value={pinkSheetDates[pos.position] || ''}
                            onChange={e => handleDateChange(pos.position, e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Clear signatures confirmation */}
      <ConfirmModal
        isOpen={showClearSigsModal}
        onClose={() => setShowClearSigsModal(false)}
        onConfirm={async () => {
          setShowClearSigsModal(false);
          try {
            await authFetch(`/api/elections/pinksheet?electionId=${selectedElection}`, { method: 'DELETE' });
            setSignatures({});
            setPinkSheetDates({});
            setTiebreakerDecisions({});
            toast.success('All signatures and dates cleared');
          } catch {
            toast.error('Failed to clear signatures');
          }
        }}
        title="Clear All Signatures"
        message="This will permanently remove all signatures, dates, and tiebreaker decisions recorded for this election. This action cannot be undone."
        confirmText="Yes, Clear All"
        cancelText="Keep Signatures"
        type="danger"
      />

      {/* Agent password modal */}
      <AnimatePresence>
        {agentPwdModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAgentPwdModal(null)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="bg-green-100 p-3 rounded-full mb-4">
                  <Shield size={28} className="text-[#D4AF37]" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">Agent Verification</h3>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-gray-700">{agentPwdModal.candidateName}</span>
                </p>
                <p className="text-xs text-gray-400 mb-5">{agentPwdModal.position}</p>

                <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                  Enter the password sent to this candidate&apos;s assigned agent to unlock the signature pad.
                </p>

                {/* Password input */}
                <div className="w-full text-left mb-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Agent Password</label>
                  <input
                    type="password"
                    value={agentPwdInput}
                    onChange={(e) => { setAgentPwdInput(e.target.value); setAgentPwdError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyAgentPassword()}
                    placeholder="Enter agent password"
                    autoFocus
                    className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none transition ${
                      agentPwdError
                        ? "border-red-400 focus:border-red-500 bg-red-50"
                        : "border-gray-200 focus:border-[#D4AF37]"
                    }`}
                  />
                  {agentPwdError && (
                    <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5">
                      <AlertCircle size={13} /> {agentPwdError}
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 w-full mt-6">
                  <button
                    onClick={() => setAgentPwdModal(null)}
                    disabled={agentPwdVerifying}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-medium text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyAgentPassword}
                    disabled={agentPwdVerifying || !agentPwdInput.trim()}
                    className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37] text-white rounded-lg transition disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {agentPwdVerifying
                      ? <><RefreshCw size={14} className="animate-spin" /> Verifying…</>
                      : "Verify & Sign"
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Signature pad modal */}
      {sigModal && (
        <SignaturePadModal
          label={sigModal.label}
          onSave={handleSaveSignature}
          onClose={() => setSigModal(null)}
        />
      )}
    </div>
  );
}
