"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Upload,
  Download,
  Users,
  Search,
  FileText,
  Edit,
  Trash2,
  Send,
  Mail,
  CalendarClock,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";
import { authFetch } from "@/lib/authFetch";

interface Voter {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  voterId?: string;
  token: string;
  hasVoted: boolean;
  status: string;
  createdAt: string;
  credentialsSendAt?: string;
  credentialsSent: boolean;
}

interface Election {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

function StepIndicator({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center mb-6">
      {labels.map((label, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div
            key={label}
            className={`flex items-center ${i < labels.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isDone
                    ? "bg-[#d4af37] text-white"
                    : isActive
                      ? "bg-[#1C2338] text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isDone ? <Check size={14} /> : step}
              </div>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? "text-[#1C2338]"
                    : isDone
                      ? "text-[#d4af37]"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 ${isDone ? "bg-[#d4af37]" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VotersPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [selectedElectionData, setSelectedElectionData] =
    useState<Election | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [search, setSearch] = useState("");
  const [uploadResults, setUploadResults] = useState<any>(null);
  // Parsed-but-not-yet-submitted bulk upload — the admin must confirm before
  // this is sent to the server, so a wrong file can be caught first.
  const [pendingBulkFile, setPendingBulkFile] = useState<{
    fileName: string;
    rows: Record<string, string>[];
  } | null>(null);
  const [undoingBatch, setUndoingBatch] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState<
    string | null
  >(null);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendModalData, setResendModalData] = useState<{
    voterId: string;
    voterName: string;
    voterEmail?: string;
    voterPhone?: string;
    editPhone: string;
  } | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [addingVoter, setAddingVoter] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<
    "email" | "sms" | "both"
  >("both");
  const [bulkDeliveryMethod, setBulkDeliveryMethod] = useState<
    "email" | "sms" | "both"
  >("both");
  const [scheduledSendAt, setScheduledSendAt] = useState("");
  const [bulkScheduledSendAt, setBulkScheduledSendAt] = useState("");
  // Both modals are 2-step wizards: details/preview first, schedule last.
  const [addVoterStep, setAddVoterStep] = useState(1);
  const [bulkStep, setBulkStep] = useState(1);
  const [schedulingBulk, setSchedulingBulk] = useState(false);
  const [bulkScheduled, setBulkScheduled] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleSendAt, setRescheduleSendAt] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [deletingAllVoters, setDeletingAllVoters] = useState(false);

  // Modal states
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({ isOpen: false, title: "", message: "", type: "info" });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "warning",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    voterId: "",
    department: "",
    class: "",
  });

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchVoters();
      const election = elections.find((e) => e._id === selectedElection);
      setSelectedElectionData(election || null);
    }
  }, [selectedElection, elections]);

  const fetchElections = async () => {
    try {
      const response = await authFetch("/api/elections");

      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
        if (data.data.length > 0) {
          setSelectedElection(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch elections:", error);
    }
  };

  const fetchVoters = async () => {
    if (!selectedElection) return;

    setLoading(true);
    try {
      const response = await authFetch(
        `/api/elections/voters?electionId=${selectedElection}`,
      );

      if (response.ok) {
        const data = await response.json();
        setVoters(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch voters:", error);
      toast.error("Failed to load voters");
    } finally {
      setLoading(false);
    }
  };
  const toDatetimeLocalValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const minScheduleValue = toDatetimeLocalValue(
    new Date(Date.now() + 60 * 1000),
  );
  const maxScheduleValue = selectedElectionData
    ? toDatetimeLocalValue(new Date(selectedElectionData.endDate))
    : undefined;

  const isElectionEnded = () => {
    if (!selectedElectionData) return false;
    const endDate = new Date(selectedElectionData.endDate);
    const now = new Date();
    return now > endDate;
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isElectionEnded()) {
      toast.error("Cannot add voters. This election has already ended.");
      return;
    }

    if (!editingVoter && !scheduledSendAt) {
      toast.error("Please pick when credentials should be sent.");
      return;
    }

    setAddingVoter(true);

    try {
      const url = editingVoter
        ? `/api/elections/voters/${editingVoter._id}`
        : "/api/elections/voters";
      const method = editingVoter ? "PUT" : "POST";

      const payload: any = {
        electionId: selectedElection,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        voterId: formData.voterId || undefined,
        deliveryMethod: deliveryMethod, // Add delivery method
        metadata: {
          department: formData.department,
          class: formData.class,
        },
      };
      if (!editingVoter) {
        payload.credentialsSendAt = new Date(scheduledSendAt).toISOString();
      }

      const response = await authFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();

        if (editingVoter) {
          toast.success("Voter updated successfully!");
        } else {
          setAlertModal({
            isOpen: true,
            title: "Voter Added",
            message:
              data.message ||
              `${formData.name} was added. Their login credentials will be generated and sent at the scheduled time.`,
            type: "success",
          });
        }

        setShowAddModal(false);
        setEditingVoter(null);
        setScheduledSendAt("");
        setAddVoterStep(1);
        resetForm();
        fetchVoters();
      } else {
        const data = await response.json();
        toast.error(
          data.error || `Failed to ${editingVoter ? "update" : "add"} voter`,
        );
      }
    } catch (error) {
      console.error("Submit voter error:", error);
      toast.error(`Failed to ${editingVoter ? "update" : "add"} voter`);
    } finally {
      setAddingVoter(false);
    }
  };

  const handleEdit = (voter: Voter) => {
    setEditingVoter(voter);
    setFormData({
      name: voter.name,
      email: voter.email || "",
      phone: voter.phone || "",
      voterId: voter.voterId || "",
      department: (voter as any).metadata?.department || "",
      class: (voter as any).metadata?.class || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (voterId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Voter",
      message:
        "Are you sure you want to delete this voter? This action cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          const response = await authFetch(`/api/elections/voters/${voterId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            toast.success("Voter deleted successfully!");
            fetchVoters();
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to delete voter");
          }
        } catch (error) {
          console.error("Delete voter error:", error);
          toast.error("Failed to delete voter");
        }
      },
    });
  };

  const handleResendCredentials = (
    voterId: string,
    voterName: string,
    voterEmail?: string,
    voterPhone?: string,
  ) => {
    if (!voterEmail && !voterPhone) {
      toast.error("Voter does not have an email address or phone number");
      return;
    }
    setResendModalData({
      voterId,
      voterName,
      voterEmail,
      voterPhone,
      editPhone: voterPhone || "",
    });
    setShowResendModal(true);
  };

  const doResendCredentials = async () => {
    if (!resendModalData) return;
    const { voterId, editPhone } = resendModalData;
    setShowResendModal(false);
    setResendingCredentials(voterId);
    try {
      const response = await authFetch(
        `/api/elections/voters/${voterId}/resend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: editPhone || undefined }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const methods = [];
        if (data.data?.emailSent) methods.push("email");
        if (data.data?.smsSent) methods.push("SMS");
        const methodText =
          methods.length > 0 ? ` via ${methods.join(" and ")}` : "";
        toast.success(`Credentials resent successfully${methodText}!`);
        fetchVoters();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to resend credentials");
      }
    } catch (error) {
      console.error("Resend credentials error:", error);
      toast.error("Failed to resend credentials");
    } finally {
      setResendingCredentials(null);
      setResendModalData(null);
    }
  };

  // Step 1: parse the CSV locally and show a preview — nothing is sent to
  // the server yet, so a wrong file can be caught before it does any harm.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isElectionEnded()) {
      toast.error("Cannot upload voters. This election has already ended.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Excel typically ends lines with \r\n — strip the \r so it can't
        // end up appended to whichever field is last on the line.
        const lines = text
          .split("\n")
          .map((line) => line.replace(/\r$/, ""))
          .filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error("CSV file must have at least a header and one data row");
          return;
        }

        // Header matching is case-insensitive, but the row keys sent to the
        // bulk API must match its camelCase field names exactly (voterId,
        // studentId) — lowercasing alone would silently drop those columns.
        const CANONICAL_FIELD_NAMES: Record<string, string> = {
          voterid: "voterId",
          studentid: "studentId",
        };
        const headers = parseCsvLine(lines[0]).map((h) => {
          const lower = h.toLowerCase();
          return CANONICAL_FIELD_NAMES[lower] || lower;
        });
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const row: Record<string, string> = {};

          headers.forEach((header, index) => {
            if (values[index]) {
              row[header] = values[index];
            }
          });

          rows.push(row);
        }

        if (rows.length === 0) {
          toast.error("No data rows found in this file");
          return;
        }

        setPendingBulkFile({ fileName: file.name, rows });
        setBulkStep(1);
      } catch (error) {
        console.error("CSV parse error:", error);
        toast.error("Failed to parse CSV file");
      } finally {
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const cancelPendingBulkFile = () => {
    setPendingBulkFile(null);
    setBulkStep(1);
  };

  // Step 1: actually store the rows — this is what surfaces real duplicates
  // (against existing voters and within the file itself) and other rows
  // that couldn't be saved, so the admin reviews what's true in the
  // database, not just a client-side guess. No schedule is required yet.
  const handleBulkUpload = async () => {
    if (!pendingBulkFile) return;

    setUploadingBulk(true);
    try {
      const response = await authFetch("/api/elections/voters/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: selectedElection,
          voters: pendingBulkFile.rows,
          deliveryMethod: bulkDeliveryMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          data.message ||
            `Successfully uploaded ${data.data.successful} voters!`,
        );
        setUploadResults(data.data);
        setPendingBulkFile(null);
        setBulkStep(1);
        fetchVoters();
      } else {
        toast.error(data.error || "Failed to upload voters");
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Failed to upload voters");
    } finally {
      setUploadingBulk(false);
    }
  };

  // Step 2: schedule credential delivery for just this batch (everything
  // stored in step 1 that hasn't already been sent).
  const confirmBulkSchedule = async () => {
    if (!uploadResults?.batchId || !bulkScheduledSendAt) return;

    setSchedulingBulk(true);
    try {
      const response = await authFetch("/api/elections/voters/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: selectedElection,
          batchId: uploadResults.batchId,
          credentialsSendAt: new Date(bulkScheduledSendAt).toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Scheduled successfully!");
        setBulkScheduled(true);
        fetchVoters();
      } else {
        toast.error(data.error || "Failed to schedule credentials");
      }
    } catch (error) {
      console.error("Bulk schedule error:", error);
      toast.error("Failed to schedule credentials");
    } finally {
      setSchedulingBulk(false);
    }
  };

  // Undo: removes every voter from a just-completed upload, in case the
  // mistake wasn't caught at the preview step.
  const undoBulkUpload = async () => {
    if (!uploadResults?.batchId || !selectedElection) return;

    setConfirmModal({
      isOpen: true,
      title: "Undo This Upload",
      message: `Remove all ${uploadResults.successful} voter(s) just added? Voters who have already voted will be kept.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setUndoingBatch(true);
        try {
          const response = await authFetch(
            `/api/elections/voters/bulk?batchId=${uploadResults.batchId}&electionId=${selectedElection}`,
            { method: "DELETE" },
          );
          const data = await response.json();
          if (response.ok) {
            toast.success(data.message || "Upload undone");
            setUploadResults(null);
            setBulkStep(1);
            setBulkScheduled(false);
            setBulkScheduledSendAt("");
            fetchVoters();
          } else {
            toast.error(data.error || "Failed to undo upload");
          }
        } catch (error) {
          console.error("Undo bulk upload error:", error);
          toast.error("Failed to undo upload");
        } finally {
          setUndoingBatch(false);
        }
      },
    });
  };

  // Wipes every voter registered for the currently selected election.
  // Voters who have already voted are kept (their votes stay intact).
  const handleDeleteAllVoters = () => {
    if (!selectedElection || voters.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete All Voters",
      message: `This permanently removes all ${voters.length} voter(s) registered for this election. Voters who have already voted will be kept to protect recorded results. This cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setDeletingAllVoters(true);
        try {
          const response = await authFetch(
            `/api/elections/voters/bulk?electionId=${selectedElection}`,
            { method: "DELETE" },
          );
          const data = await response.json();
          if (response.ok) {
            toast.success(data.message || "Voters deleted");
            fetchVoters();
          } else {
            toast.error(data.error || "Failed to delete voters");
          }
        } catch (error) {
          console.error("Delete all voters error:", error);
          toast.error("Failed to delete voters");
        } finally {
          setDeletingAllVoters(false);
        }
      },
    });
  };

  const downloadTemplate = () => {
    const csv = `name,email,phone,voterId,department,class
"John Doe","john@example.com","233552732025","STU001","Computer Science","2023"
"Jane Smith","jane@example.com","233244123456","STU002","Engineering","2024"
"Bob Johnson","bob@example.com","0553732025","STU003","Business","2023"`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voters-upload-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      voterId: "",
      department: "",
      class: "",
    });
  };

  const filteredVoters = voters.filter(
    (voter) =>
      voter.name.toLowerCase().includes(search.toLowerCase()) ||
      voter.email?.toLowerCase().includes(search.toLowerCase()) ||
      voter.voterId?.toLowerCase().includes(search.toLowerCase()),
  );

  const pendingVotersCount = voters.filter((v) => !v.credentialsSent).length;

  const confirmReschedule = async () => {
    if (!rescheduleSendAt) return;

    setRescheduling(true);
    try {
      const response = await authFetch("/api/elections/voters/reschedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId: selectedElection,
          credentialsSendAt: new Date(rescheduleSendAt).toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Rescheduled successfully!");
        setShowRescheduleModal(false);
        setRescheduleSendAt("");
        fetchVoters();
      } else {
        toast.error(data.error || "Failed to reschedule credentials");
      }
    } catch (error) {
      console.error("Reschedule error:", error);
      toast.error("Failed to reschedule credentials");
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voters Management</h1>
        <p className="text-gray-500 mt-1">
          Add and manage voters for your elections
        </p>
      </div>

      {/* Election Selector */}
      <label className="block text-sm font-medium mb-2">Select Election</label>
      <div className="mb-6 flex justify-between items-center lg:flex-row flex-col gap-4">
        <div className="w-full md:w-1/2">
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          >
            {elections.map((election) => (
              <option key={election._id} value={election._id}>
                {election.title}
              </option>
            ))}
          </select>
        </div>
        {selectedElection && (
          <div>
            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (isElectionEnded()) {
                    toast.error(
                      "Cannot add voters. This election has already ended.",
                    );
                    return;
                  }
                  setScheduledSendAt("");
                  setAddVoterStep(1);
                  setShowAddModal(true);
                }}
                disabled={isElectionEnded()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isElectionEnded()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#d4af37] text-white hover:bg-[#d4af37]"
                }`}
              >
                <Plus size={18} />
                Add Voter
              </button>
              <button
                onClick={() => {
                  if (isElectionEnded()) {
                    toast.error(
                      "Cannot reschedule. This election has already ended.",
                    );
                    return;
                  }
                  if (pendingVotersCount === 0) {
                    toast.error(
                      "No pending voters to reschedule — everyone already has credentials sent.",
                    );
                    return;
                  }
                  setRescheduleSendAt("");
                  setShowRescheduleModal(true);
                }}
                disabled={isElectionEnded() || pendingVotersCount === 0}
                title={
                  pendingVotersCount === 0
                    ? "No pending voters to reschedule"
                    : `Reschedule credential delivery for ${pendingVotersCount} pending voter(s)`
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isElectionEnded() || pendingVotersCount === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-white text-[#1C2338] border border-[#1C2338] hover:bg-gray-50"
                }`}
              >
                <CalendarClock size={18} />
                Reschedule
                {pendingVotersCount > 0 ? ` (${pendingVotersCount})` : ""}
              </button>
              <button
                onClick={() => {
                  if (isElectionEnded()) {
                    toast.error(
                      "Cannot upload voters. This election has already ended.",
                    );
                    return;
                  }
                  setPendingBulkFile(null);
                  setUploadResults(null);
                  setBulkScheduledSendAt("");
                  setBulkStep(1);
                  setBulkScheduled(false);
                  setShowBulkModal(true);
                }}
                disabled={isElectionEnded()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isElectionEnded()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1C2338] text-white hover:bg-[#1C2338]"
                }`}
              >
                <Upload size={18} />
                Bulk Upload
              </button>
              <button
                onClick={handleDeleteAllVoters}
                disabled={deletingAllVoters || voters.length === 0}
                title={
                  voters.length === 0
                    ? "No voters to delete"
                    : `Delete all ${voters.length} voter(s) for this election`
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  deletingAllVoters || voters.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                <Trash2 size={18} />
                {deletingAllVoters ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedElection && (
        <>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search voters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
              />
            </div>
          </div>

          {/* Voters Table */}
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#d4af37] rounded-full animate-spin"></div>
                  <span className="text-gray-500">Loading voters...</span>
                </div>
              </div>
            ) : filteredVoters.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="text-gray-400" size={48} />
                  <span className="text-gray-500">No voters found</span>
                </div>
              </div>
            ) : (
              filteredVoters.map((voter) => (
                <div
                  key={voter._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {voter.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mt-0.5">
                        {voter.email || (
                          <span className="text-gray-400 italic">No email</span>
                        )}
                      </p>
                      {voter.phone && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                          {voter.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() =>
                          handleResendCredentials(
                            voter._id,
                            voter.name,
                            voter.email,
                            voter.phone,
                          )
                        }
                        className="p-2 text-[#1C2338] hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          voter.hasVoted ||
                          (!voter.email && !voter.phone) ||
                          resendingCredentials === voter._id
                        }
                        title={
                          voter.hasVoted
                            ? "Cannot resend to voter who has voted"
                            : !voter.email && !voter.phone
                              ? "No email or phone number"
                              : "Resend credentials"
                        }
                      >
                        {resendingCredentials === voter._id ? (
                          <div className="w-4 h-4 border-2 border-[#1C2338] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(voter)}
                        className="p-2 text-[#d4af37] hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={true}
                        title="Voter cannot be edited after being added. Use Resend Credentials to update phone number."
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(voter._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={voter.hasVoted}
                        title={
                          voter.hasVoted
                            ? "Cannot delete voter who has voted"
                            : "Delete voter"
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Student Number:</span>
                      <code className="px-2 py-1 bg-gray-100 text-[#d4af37] rounded text-xs font-mono">
                        {voter.voterId || "—"}
                      </code>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          voter.status === "active"
                            ? "bg-green-100 text-[#d4af37]"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {voter.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Voted:</span>
                      {voter.hasVoted ? (
                        <span className="inline-flex items-center gap-1 text-[#d4af37] font-medium text-xs">
                          <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
                          Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Credentials:</span>
                      {voter.credentialsSent ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-[#d4af37]">
                          Sent
                        </span>
                      ) : voter.credentialsSendAt ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 text-right">
                          {new Date(voter.credentialsSendAt).toLocaleString(
                            "en-US",
                            { dateStyle: "medium", timeStyle: "short" },
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                          Not Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Name
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Email
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Phone
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Student Number
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Voted
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Credentials
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#d4af37] rounded-full animate-spin"></div>
                          <span>Loading voters...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVoters.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users className="text-gray-400" size={48} />
                          <span>No voters found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVoters.map((voter) => (
                      <tr
                        key={voter._id}
                        className="hover:bg-green-50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">
                            {voter.name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600">
                            {voter.email || (
                              <span className="text-gray-400 italic">
                                No email
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600">
                            {voter.phone || (
                              <span className="text-gray-400 italic">
                                No phone
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <code className="px-2 py-1 bg-gray-100 text-[#d4af37] rounded text-sm font-mono">
                            {voter.voterId || "—"}
                          </code>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                              voter.status === "active"
                                ? "bg-green-100 text-[#d4af37]"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {voter.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {voter.hasVoted ? (
                            <span className="inline-flex items-center gap-1 text-[#d4af37] font-medium">
                              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
                              Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {voter.credentialsSent ? (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-[#d4af37]">
                              Sent
                            </span>
                          ) : voter.credentialsSendAt ? (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                              {new Date(voter.credentialsSendAt).toLocaleString(
                                "en-US",
                                { dateStyle: "medium", timeStyle: "short" },
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                              Not Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleResendCredentials(
                                  voter._id,
                                  voter.name,
                                  voter.email,
                                  voter.phone,
                                )
                              }
                              className="p-2 text-[#1C2338] hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={
                                voter.hasVoted ||
                                (!voter.email && !voter.phone) ||
                                resendingCredentials === voter._id
                              }
                              title={
                                voter.hasVoted
                                  ? "Cannot resend to voter who has voted"
                                  : !voter.email && !voter.phone
                                    ? "No email or phone number"
                                    : "Resend credentials"
                              }
                            >
                              {resendingCredentials === voter._id ? (
                                <div className="w-4 h-4 border-2 border-[#1C2338] border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Send size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(voter)}
                              className="p-2 text-[#d4af37] hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={true}
                              title="Voter cannot be edited after being added. Use Resend Credentials to update phone number."
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(voter._id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={voter.hasVoted}
                              title={
                                voter.hasVoted
                                  ? "Cannot delete voter who has voted"
                                  : "Delete voter"
                              }
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between bg-[#d4af37] items-center p-4 border-b border-gray-200 rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">
                {editingVoter ? "Edit Voter" : "Add Voter"}
              </h2>
            </div>
            <div className="p-6">
              <StepIndicator
                current={addVoterStep}
                labels={["Voter Details", "Delivery & Schedule"]}
              />
              <form onSubmit={handleAddVoter} className="space-y-4">
                {addVoterStep === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Student Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.voterId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              voterId: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Class/Year
                        </label>
                        <input
                          type="text"
                          value={formData.class}
                          onChange={(e) =>
                            setFormData({ ...formData, class: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingVoter(null);
                          setScheduledSendAt("");
                          setAddVoterStep(1);
                          resetForm();
                        }}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !formData.name.trim() ||
                            !formData.voterId.trim()
                          ) {
                            toast.error("Name and Student Number are required");
                            return;
                          }
                          setAddVoterStep(2);
                        }}
                        className="px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37]"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}

                {addVoterStep === 2 && (
                  <>
                    {/* Delivery Method Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send Credentials Via{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value="email"
                            checked={deliveryMethod === "email"}
                            onChange={(e) =>
                              setDeliveryMethod(
                                e.target.value as "email" | "sms" | "both",
                              )
                            }
                            className="w-4 h-4 text-[#d4af37]"
                          />
                          <span className="text-sm text-gray-700">
                            Email Only
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value="sms"
                            checked={deliveryMethod === "sms"}
                            onChange={(e) =>
                              setDeliveryMethod(
                                e.target.value as "email" | "sms" | "both",
                              )
                            }
                            className="w-4 h-4 text-[#d4af37]"
                          />
                          <span className="text-sm text-gray-700">
                            SMS Only
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value="both"
                            checked={deliveryMethod === "both"}
                            onChange={(e) =>
                              setDeliveryMethod(
                                e.target.value as "email" | "sms" | "both",
                              )
                            }
                            className="w-4 h-4 text-[#d4af37]"
                          />
                          <span className="text-sm text-gray-700">
                            Both Email & SMS
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {deliveryMethod === "email" &&
                          "Credentials will be sent via email only. Email is required."}
                        {deliveryMethod === "sms" &&
                          "Credentials will be sent via SMS only. Phone number is required."}
                        {deliveryMethod === "both" &&
                          "Credentials will be sent via both email and SMS if available."}
                      </p>
                    </div>

                    {!editingVoter && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Send Credentials On{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={scheduledSendAt}
                          min={minScheduleValue}
                          max={maxScheduleValue}
                          onChange={(e) => setScheduledSendAt(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The voter&apos;s login link and password are generated
                          fresh at this exact time and delivered then — not
                          before.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setAddVoterStep(1)}
                        disabled={addingVoter}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={
                          addingVoter || (!editingVoter && !scheduledSendAt)
                        }
                        className="px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {addingVoter && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {addingVoter
                          ? editingVoter
                            ? "Updating..."
                            : "Adding..."
                          : editingVoter
                            ? "Update Voter"
                            : "Add Voter"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#d4af37] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-semibold">Bulk Upload Voters</h3>
            </div>
            <div className="p-6">
              {selectedElectionData && (
                <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Uploading to: <strong>{selectedElectionData.title}</strong>
                </div>
              )}

              {/* ── Done (uploaded AND scheduled) ── */}
              {bulkScheduled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">
                      {uploadResults.successful} voter(s) stored and scheduled
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Credentials will be generated and sent on{" "}
                      {new Date(bulkScheduledSendAt).toLocaleString()}.
                    </p>
                    {uploadResults.failed > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadResults.failed} row(s) were not stored — see
                        the review step if you need those details again.
                      </p>
                    )}
                  </div>

                  {/* <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        Uploaded the wrong file?
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Undo removes every voter just added by this upload.
                        Anyone who has already voted will be kept.
                      </p>
                    </div>
                    <button
                      onClick={undoBulkUpload}
                      disabled={undoingBatch || !uploadResults.batchId}
                      className="shrink-0 px-4 py-2 text-yellow-600 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {undoingBatch ? "Undoing…" : "Undo This Upload"}
                    </button>
                  </div> */}

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setUploadResults(null);
                        setBulkScheduledSendAt("");
                        setBulkStep(1);
                        setBulkScheduled(false);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : uploadResults ? (
                /* ── Review what got stored, then schedule ── */
                <div className="space-y-4">
                  <StepIndicator
                    current={bulkStep}
                    labels={["Upload & Review", "Schedule"]}
                  />

                  {bulkStep === 1 && (
                    <>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800">
                          {uploadResults.successful} of {uploadResults.total}{" "}
                          voter(s) stored successfully
                        </p>
                        {uploadResults.failed > 0 && (
                          <p className="text-xs text-red-700 mt-1">
                            {uploadResults.failed} row(s) could not be
                            stored — duplicates or missing data. Review below
                            and fix them in your source file before your next
                            upload.
                          </p>
                        )}
                      </div>

                      {uploadResults.errors?.length > 0 && (
                        <div className="border border-red-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto max-h-64 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-red-50 sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">
                                    Row
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">
                                    Name
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-red-700 uppercase tracking-wide whitespace-nowrap">
                                    Student Number
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-red-700 uppercase tracking-wide">
                                    Reason
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {uploadResults.errors.map((e: any) => (
                                  <tr key={e.row}>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                      {e.row}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                      {e.data?.name || (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                      {e.data?.voterId || (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-red-700">
                                      {e.error}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="p-4  border border-red-200 rounded-lg flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-yellow-800">
                            Uploaded the wrong file?
                          </p>
                          <p className="text-xs text-yellow-800 mt-0.5">
                            Undo removes every voter just added by this
                            upload before you go any further.
                          </p>
                        </div>
                        <button
                          onClick={undoBulkUpload}
                          disabled={undoingBatch || !uploadResults.batchId}
                          className="shrink-0 px-4 py-2  text-yellow-800 text-sm font-medium rounded-lg cursor-pointer border-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {undoingBatch ? "Undoing…" : "Undo This Upload"}
                        </button>
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          onClick={() => {
                            setShowBulkModal(false);
                            setUploadResults(null);
                            setBulkStep(1);
                          }}
                          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          Close Without Scheduling
                        </button>
                        {uploadResults.successful > 0 && (
                          <button
                            onClick={() => setBulkStep(2)}
                            className="px-5 py-2 bg-[#d4af37] text-white font-medium rounded-lg hover:bg-[#c19d2f]"
                          >
                            Next: Schedule ({uploadResults.successful})
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {bulkStep === 2 && (
                    <>
                      <p className="text-sm text-gray-600">
                        {uploadResults.successful} voter(s) from this upload
                        are stored and waiting to be scheduled.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Send Credentials On{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={bulkScheduledSendAt}
                          min={minScheduleValue}
                          max={maxScheduleValue}
                          onChange={(e) =>
                            setBulkScheduledSendAt(e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Applies to this batch. Each voter&apos;s login link
                          and password are generated fresh at this exact time
                          and delivered then — not before.
                        </p>
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          onClick={() => setBulkStep(1)}
                          disabled={schedulingBulk}
                          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Back
                        </button>
                        <button
                          onClick={confirmBulkSchedule}
                          disabled={schedulingBulk || !bulkScheduledSendAt}
                          className="px-5 py-2 bg-[#d4af37] text-white font-medium rounded-lg hover:bg-[#c19d2f] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {schedulingBulk
                            ? "Scheduling…"
                            : `Confirm Schedule (${uploadResults.successful})`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : pendingBulkFile ? (
                /* ── Preview (parsed, not yet submitted) ── */
                <div className="space-y-4">
                  <StepIndicator
                    current={1}
                    labels={["Upload & Review", "Schedule"]}
                  />

                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {pendingBulkFile.fileName}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {pendingBulkFile.rows.length} voter
                      {pendingBulkFile.rows.length !== 1 ? "s" : ""} detected.
                      Review the preview below, then upload to see what
                      actually gets stored.
                    </p>
                  </div>

                  {pendingBulkFile.rows.some(
                    (r) => r.phone && /0{4,}$/.test(r.phone),
                  ) && (
                    <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      Some phone numbers end in several zeros — this can
                      happen when a spreadsheet app mangles numeric columns.
                      Double-check them before uploading.
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(pendingBulkFile.rows[0]).map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pendingBulkFile.rows.slice(0, 10).map((row, i) => (
                            <tr key={i}>
                              {Object.keys(pendingBulkFile.rows[0]).map(
                                (h) => (
                                  <td
                                    key={h}
                                    className="px-3 py-2 text-gray-700 whitespace-nowrap"
                                  >
                                    {row[h] || (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pendingBulkFile.rows.length > 10 && (
                      <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 border-t border-gray-100">
                        + {pendingBulkFile.rows.length - 10} more row(s) not
                        shown
                      </p>
                    )}
                  </div>

                  {/* Delivery Method Selection for Bulk Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send Credentials Via{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bulkDeliveryMethod"
                          value="email"
                          checked={bulkDeliveryMethod === "email"}
                          onChange={(e) =>
                            setBulkDeliveryMethod(
                              e.target.value as "email" | "sms" | "both",
                            )
                          }
                          className="w-4 h-4 text-[#d4af37]"
                        />
                        <span className="text-sm text-gray-700">
                          Email Only
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bulkDeliveryMethod"
                          value="sms"
                          checked={bulkDeliveryMethod === "sms"}
                          onChange={(e) =>
                            setBulkDeliveryMethod(
                              e.target.value as "email" | "sms" | "both",
                            )
                          }
                          className="w-4 h-4 text-[#d4af37]"
                        />
                        <span className="text-sm text-gray-700">
                          SMS Only
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="bulkDeliveryMethod"
                          value="both"
                          checked={bulkDeliveryMethod === "both"}
                          onChange={(e) =>
                            setBulkDeliveryMethod(
                              e.target.value as "email" | "sms" | "both",
                            )
                          }
                          className="w-4 h-4 text-[#d4af37]"
                        />
                        <span className="text-sm text-gray-700">
                          Both Email & SMS
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={cancelPendingBulkFile}
                      disabled={uploadingBulk}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Choose a Different File
                    </button>
                    <button
                      onClick={handleBulkUpload}
                      disabled={uploadingBulk}
                      className="px-5 py-2 bg-[#d4af37] text-white font-medium rounded-lg hover:bg-[#c19d2f] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingBulk
                        ? "Uploading…"
                        : `Upload ${pendingBulkFile.rows.length} Voter${pendingBulkFile.rows.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── File picker (nothing chosen yet) ── */
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a CSV file with voter information. The file should
                      have the following columns:
                    </p>

                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-[#d4af37] hover:text-[#d4af37] flex items-center gap-2 font-medium"
                    >
                      <Download size={16} />
                      Download CSV Template (with instructions)
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 mb-4">
                      Click to upload or drag and drop
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-block px-6 py-3 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] cursor-pointer"
                    >
                      Choose CSV File
                    </label>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="bg-[#1C2338] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-semibold">
                Reschedule Credential Delivery
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                {pendingVotersCount} voter{pendingVotersCount !== 1 ? "s" : ""}{" "}
                in <strong>{selectedElectionData?.title}</strong>{" "}
                {pendingVotersCount !== 1 ? "haven't" : "hasn't"} had
                credentials sent yet. Pick a new date/time to send them at —
                this replaces whatever time was set before.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Send Date/Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleSendAt}
                  min={minScheduleValue}
                  max={maxScheduleValue}
                  onChange={(e) => setRescheduleSendAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setRescheduleSendAt("");
                  }}
                  disabled={rescheduling}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={rescheduling || !rescheduleSendAt}
                  className="px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {rescheduling && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {rescheduling ? "Rescheduling…" : "Reschedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />

      {/* Resend Credentials Modal */}
      {showResendModal && resendModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="bg-[#d4af37] p-4 rounded-t-xl">
              <h2 className="text-lg font-bold text-white">
                Resend Credentials
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Update contact info and resend login credentials
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voter Name
                </label>
                <input
                  type="text"
                  value={resendModalData.voterName}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={resendModalData.voterEmail || "—"}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Email cannot be changed here
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number{" "}
                  <span className="text-[#d4af37]">(editable)</span>
                </label>
                <input
                  type="tel"
                  value={resendModalData.editPhone}
                  onChange={(e) =>
                    setResendModalData({
                      ...resendModalData,
                      editPhone: e.target.value,
                    })
                  }
                  placeholder="e.g. 0241234567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1C2338] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A new password will be generated and sent to this number
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowResendModal(false);
                    setResendModalData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={doResendCredentials}
                  className="flex-1 px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#1C2338] transition text-sm font-medium"
                >
                  Resend Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
