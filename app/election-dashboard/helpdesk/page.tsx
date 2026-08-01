"use client";

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Mail, Lock, User, Shield, Search, Edit, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from "@/components/ConfirmModal";

interface Election {
  _id: string;
  title: string;
}

interface HelpdeskUser {
  _id: string;
  username: string;
  email: string;
  status: string;
  assignedElections: Election[];
  createdAt: string;
}

export default function HelpdeskManagementPage() {
  const [helpdeskUsers, setHelpdeskUsers] = useState<HelpdeskUser[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<HelpdeskUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    assignedElections: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  useEffect(() => {
    fetchHelpdeskUsers();
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    }
  };

  const fetchHelpdeskUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/helpdesk/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setHelpdeskUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch helpdesk users:', error);
      toast.error('Failed to load helpdesk users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.assignedElections.length === 0) {
      toast.error('Please assign at least one election');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/helpdesk/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Help desk user added successfully!');
        setShowAddModal(false);
        setFormData({ username: '', email: '', password: '', assignedElections: [] });
        fetchHelpdeskUsers();
      } else {
        toast.error(data.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      toast.error('Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (formData.assignedElections.length === 0) {
      toast.error('Please assign at least one election');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/helpdesk/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignedElections: formData.assignedElections,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Elections updated successfully!');
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({ username: '', email: '', password: '', assignedElections: [] });
        fetchHelpdeskUsers();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: HelpdeskUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      assignedElections: user.assignedElections.map(e => e._id),
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Help Desk User",
      message: "Are you sure you want to delete this help desk user?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/helpdesk/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            toast.success('User deleted successfully');
            fetchHelpdeskUsers();
          } else {
            const data = await response.json();
            toast.error(data.error || 'Failed to delete user');
          }
        } catch (error) {
          console.error('Failed to delete user:', error);
          toast.error('Failed to delete user');
        }
      }
    });
  };

  const toggleElection = (electionId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedElections: prev.assignedElections.includes(electionId)
        ? prev.assignedElections.filter(id => id !== electionId)
        : [...prev.assignedElections, electionId]
    }));
  };

  const filteredUsers = helpdeskUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row items-center justify-between  gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Help Desk Management</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage help desk users who can assist voters</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37] transition w-full sm:w-auto"
        >
          <UserPlus size={20} />
          <span>Add Help Desk User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">
              {searchTerm ? 'No users found' : 'No help desk users yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {filteredUsers.map((user) => (
                <div key={user._id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="text-[#D4AF37]" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-[#D4AF37]' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Assigned Elections:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.assignedElections.length > 0 ? (
                        user.assignedElections.map((election) => (
                          <span
                            key={election._id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                          >
                            {election.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No elections assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit assigned elections"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete user"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Assigned Elections</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Created</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="text-[#D4AF37]" size={16} />
                        </div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.assignedElections.length > 0 ? (
                          user.assignedElections.map((election) => (
                            <span
                              key={election._id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                            >
                              {election.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No elections assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-[#D4AF37]' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-700 transition"
                          title="Edit assigned elections"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-700 transition"
                          title="Delete user"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Help Desk User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter password (min 6 characters)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assign Elections *</label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {elections.length === 0 ? (
                    <p className="text-sm text-gray-500">No elections available</p>
                  ) : (
                    elections.map((election) => (
                      <label
                        key={election._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ username: '', email: '', password: '', assignedElections: [] });
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Assigned Elections</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.username}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assign Elections *</label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {elections.length === 0 ? (
                    <p className="text-sm text-gray-500">No elections available</p>
                  ) : (
                    elections.map((election) => (
                      <label
                        key={election._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setFormData({ username: '', email: '', password: '', assignedElections: [] });
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37] transition disabled:opacity-50 font-semibold"
                >
                  {submitting ? 'Updating...' : 'Update'}
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
