"use client";

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from "@/components/ConfirmModal";

interface Position {
  _id: string;
  name: string;
  maxSelections: number;
  order: number;
}

interface Election {
  _id: string;
  title: string;
}

export default function PositionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    maxSelections: 1,
    order: 0,
  });
  
  // Modal state
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

  useEffect(() => {
    if (selectedElection) {
      fetchPositions();
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
        if (data.data.length > 0) {
          setSelectedElection(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    }
  };

  const fetchPositions = async () => {
    if (!selectedElection) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/elections/categories?electionId=${selectedElection}`);

      if (response.ok) {
        const data = await response.json();
        setPositions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      toast.error('Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingPosition
        ? `/api/elections/categories/${editingPosition._id}`
        : '/api/elections/categories';
      const method = editingPosition ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          electionId: selectedElection,
          ...formData,
        }),
      });

      if (response.ok) {
        toast.success(editingPosition ? 'Position updated successfully!' : 'Position created successfully!');
        setShowModal(false);
        setEditingPosition(null);
        resetForm();
        fetchPositions();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${editingPosition ? 'update' : 'create'} position`);
      }
    } catch (error) {
      console.error('Submit position error:', error);
      toast.error(`Failed to ${editingPosition ? 'update' : 'create'} position`);
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      maxSelections: position.maxSelections,
      order: position.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (positionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Position",
      message: "Are you sure you want to delete this position? This will also delete all candidates in this position.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/elections/categories/${positionId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            toast.success('Position deleted successfully!');
            fetchPositions();
          } else {
            const data = await response.json();
            toast.error(data.error || 'Failed to delete position');
          }
        } catch (error) {
          console.error('Delete position error:', error);
          toast.error('Failed to delete position');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      maxSelections: 1,
      order: 0,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Positions Management</h1>
        <p className="text-gray-500 mt-1">Create and manage election positions/categories</p>
      </div>

      {/* Election Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Election</label>
        <select
          value={selectedElection}
          onChange={(e) => setSelectedElection(e.target.value)}
          className="w-full md:w-96 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent bg-white shadow-sm"
        >
          {elections.map((election) => (
            <option key={election._id} value={election._id}>
              {election.title}
            </option>
          ))}
        </select>
      </div>

      {selectedElection && (
        <>
          {/* Add Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white rounded-lg hover:bg-[#d4af37] transition shadow-md hover:shadow-lg"
            >
              <Plus size={20} />
              Add Position
            </button>
          </div>

          {/* Positions List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : positions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GripVertical className="text-[#D4AF37]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Positions Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create positions like President, Secretary, etc.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white rounded-lg hover:bg-[#d4af37] transition"
              >
                <Plus size={20} />
                Add Position
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {positions.map((position) => (
                  <div key={position._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-[#d4af37] font-semibold">
                          {position.order}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{position.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Position</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Max: {position.maxSelections}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(position)}
                          className="p-2 text-[#D4AF37] hover:bg-green-100 rounded-lg transition"
                          title="Edit position"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(position._id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Delete position"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-black">Order</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-black">Position Name</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-black">Max Selections</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {positions.map((position) => (
                        <tr key={position._id} className="hover:bg-green-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-[#d4af37] font-semibold text-sm">
                              {position.order}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-gray-900">{position.name}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                              {position.maxSelections} {position.maxSelections === 1 ? 'candidate' : 'candidates'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(position)}
                                className="p-2 text-[#D4AF37] hover:bg-green-100 rounded-lg transition"
                                title="Edit position"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(position._id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                title="Delete position"
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
              </div>
            </>
          )}
        </>
      )}

      {/* Add Position Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="bg-[#1C2338] p-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">{editingPosition ? 'Edit Position' : 'Add Position'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Position Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., President, Secretary, Treasurer"
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Selections *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxSelections}
                    onChange={(e) => setFormData({ ...formData, maxSelections: parseInt(e.target.value) })}
                    className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of candidates voters can select</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.order || 0}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingPosition(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#d4af37]"
                >
                  {editingPosition ? 'Update Position' : 'Add Position'}
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
