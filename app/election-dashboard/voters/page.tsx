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
} from "lucide-react";
import toast from "react-hot-toast";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";
import { authFetch } from '@/lib/authFetch';

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
}

interface Election {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
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
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

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
      const response = await authFetch(`/api/elections/voters?electionId=${selectedElection}`);

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
  const isElectionEnded = () => {
    if (!selectedElectionData) return false;
    const endDate = new Date(selectedElectionData.endDate);
    const now = new Date();
    return now > endDate;
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if election has ended
    if (isElectionEnded()) {
      toast.error("Cannot add voters. This election has already ended.");
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

      const response = await authFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          editingVoter
            ? "Voter updated successfully!"
            : "Voter added successfully!",
        );

        if (!editingVoter && data.data.plainPassword) {
          setAlertModal({
            isOpen: true,
            title: "Voter Credentials",
            message: `Token: ${data.data.token}\nPassword: ${data.data.plainPassword}\n\nPlease save these credentials!`,
            type: "success"
          });
        }

        setShowAddModal(false);
        setEditingVoter(null);
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
      message: "Are you sure you want to delete this voter? This action cannot be undone.",
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
      }
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
      const response = await authFetch(`/api/elections/voters/${voterId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editPhone || undefined }),
      });

      if (response.ok) {
        const data = await response.json();
        const methods = [];
        if (data.data?.emailSent) methods.push("email");
        if (data.data?.smsSent) methods.push("SMS");
        const methodText = methods.length > 0 ? ` via ${methods.join(" and ")}` : "";
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

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isElectionEnded()) {
      toast.error("Cannot upload voters. This election has already ended.");
      e.target.value = "";
      return;
    }

    setUploadingBulk(true);
    setUploadResults(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast.error("CSV file must have at least a header and one data row");
          setUploadingBulk(false);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const voters = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          const voter: any = {};

          headers.forEach((header, index) => {
            if (values[index]) {
              voter[header] = values[index];
            }
          });

          voters.push(voter);
        }

        const response = await authFetch("/api/elections/voters/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            electionId: selectedElection,
            voters,
            deliveryMethod: bulkDeliveryMethod, // Add delivery method
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let hasPhonePrecisionLoss = false;
          if (data.data.voters) {
            hasPhonePrecisionLoss = data.data.voters.some((v: any) => {
              if (v.phone) {
                const trailingZeros = v.phone.match(/0{4,}$/);
                return trailingZeros !== null;
              }
              return false;
            });
          }

          let message = `Successfully uploaded ${data.data.successful} voters!`;
          const notifications = [];

          if (data.data.emailsSent !== undefined) {
            notifications.push(
              `Emails: ${data.data.emailsSent} sent${data.data.emailsFailed > 0 ? ` (${data.data.emailsFailed} failed)` : ""}`,
            );
          }

          if (data.data.smsSent !== undefined) {
            notifications.push(
              `SMS: ${data.data.smsSent} sent${data.data.smsFailed > 0 ? ` (${data.data.smsFailed} failed)` : ""}`,
            );
          }

          if (notifications.length > 0) {
            message += ` | ${notifications.join(" | ")}`;
          }

          toast.success(message);

          fetchVoters();
          setShowBulkModal(false);
          setUploadResults(null);
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to upload voters");
        }
      } catch (error) {
        console.error("CSV parse error:", error);
        toast.error("Failed to parse CSV file");
      } finally {
        setUploadingBulk(false);
      }
    };

    reader.readAsText(file);
  };

  const downloadCredentials = () => {
    if (!uploadResults || !uploadResults.voters) return;

    const csv = [
      "Name,Email,Token,Password",
      ...uploadResults.voters.map(
        (v: any) => `${v.name},${v.email || ""},${v.token},${v.password}`,
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voter-credentials-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      voter.token.toLowerCase().includes(search.toLowerCase()),
  );

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
                      "Cannot upload voters. This election has already ended.",
                    );
                    return;
                  }
                  setShowBulkModal(true);
                }}
                disabled={isElectionEnded()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isElectionEnded()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Upload size={18} />
                Bulk Upload
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
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(voter)}
                        className="p-2 text-[#d4af37] hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={true}
                        title="Voter cannot be edited after being added. Use Resend Token to update phone number."
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
                      <span className="text-gray-500">Token:</span>
                      <code className="px-2 py-1 bg-gray-100 text-[#d4af37] rounded text-xs font-mono">
                        {voter.token}
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
                      Token
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">
                      Voted
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
                        colSpan={7}
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
                        colSpan={7}
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
                            {voter.token}
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
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Send size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(voter)}
                              className="p-2 text-[#d4af37] hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={true}
                              title="Voter cannot be edited after being added. Use Resend Token to update phone number."
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
              <form onSubmit={handleAddVoter} className="space-y-4">
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
                      Voter ID
                    </label>
                    <input
                      type="text"
                      value={formData.voterId}
                      onChange={(e) =>
                        setFormData({ ...formData, voterId: e.target.value })
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
                        setFormData({ ...formData, department: e.target.value })
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

                {/* Delivery Method Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send Credentials Via <span className="text-red-500">*</span>
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
                      <span className="text-sm text-gray-700">Email Only</span>
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
                      <span className="text-sm text-gray-700">SMS Only</span>
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

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingVoter(null);
                      resetForm();
                    }}
                    disabled={addingVoter}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingVoter}
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
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="bg-[#d4af37] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-semibold">Bulk Upload Voters</h3>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with voter information. The file should have
                  the following columns:
                </p>

                <button
                  onClick={downloadTemplate}
                  className="text-sm text-[#d4af37] hover:text-[#d4af37] flex items-center gap-2 font-medium"
                >
                  <Download size={16} />
                  Download CSV Template (with instructions)
                </button>
              </div>

              {/* Delivery Method Selection for Bulk Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Credentials Via <span className="text-red-500">*</span>
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
                    <span className="text-sm text-gray-700">Email Only</span>
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
                    <span className="text-sm text-gray-700">SMS Only</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  {bulkDeliveryMethod === "email" &&
                    "Credentials will be sent via email only. Voters must have email addresses."}
                  {bulkDeliveryMethod === "sms" &&
                    "Credentials will be sent via SMS only. Voters must have phone numbers."}
                  {bulkDeliveryMethod === "both" &&
                    "Credentials will be sent via both email and SMS if available."}
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {uploadingBulk ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-green-200 border-t-[#d4af37] rounded-full animate-spin"></div>
                    <div>
                      <p className="text-gray-900 font-medium mb-1">
                        Uploading voters...
                      </p>
                      <p className="text-sm text-gray-500">
                        Please wait while we process your CSV file and send
                        emails
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 mb-4">
                      Click to upload or drag and drop
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleBulkUpload}
                      className="hidden"
                      id="csv-upload"
                      disabled={uploadingBulk}
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-block px-6 py-3 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Choose CSV File
                    </label>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-6">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setUploadResults(null);
                    setUploadingBulk(false);
                  }}
                  disabled={uploadingBulk}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
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
              <h2 className="text-lg font-bold text-white">Resend Credentials</h2>
              <p className="text-blue-100 text-sm mt-1">
                Update contact info and resend login credentials
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Voter Name</label>
                <input
                  type="text"
                  value={resendModalData.voterName}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={resendModalData.voterEmail || "—"}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-[#d4af37]">(editable)</span>
                </label>
                <input
                  type="tel"
                  value={resendModalData.editPhone}
                  onChange={(e) =>
                    setResendModalData({ ...resendModalData, editPhone: e.target.value })
                  }
                  placeholder="e.g. 0241234567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A new password will be generated and sent to this number
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowResendModal(false); setResendModalData(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={doResendCredentials}
                  className="flex-1 px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
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
