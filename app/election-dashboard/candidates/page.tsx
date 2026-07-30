"use client";

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageUpload from '@/components/ImageUpload';

interface Candidate {
  _id: string;
  name: string;
  image?: string;
  ballotNumber: number;
  voteCount: number;
  categoryId: {
    _id: string;
    name: string;
  };
}

interface Position {
  _id: string;
  name: string;
}

interface Election {
  _id: string;
  title: string;
}

export default function CandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    image: '',
    ballotNumber: 1,
  });

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchPositions();
      fetchCandidates();
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

    try {
      const response = await fetch(`/api/elections/categories?electionId=${selectedElection}`);

      if (response.ok) {
        const data = await response.json();
        setPositions(data.data || []);
        if (data.data.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: data.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchCandidates = async () => {
    if (!selectedElection) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/elections/candidates?electionId=${selectedElection}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.error('Please select a position');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCandidate
        ? `/api/elections/candidates/${editingCandidate._id}`
        : '/api/elections/candidates';
      const method = editingCandidate ? 'PUT' : 'POST';

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
        toast.success(editingCandidate ? 'Candidate updated successfully!' : 'Candidate added successfully!');
        setShowModal(false);
        setEditingCandidate(null);
        resetForm();
        fetchCandidates();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${editingCandidate ? 'update' : 'add'} candidate`);
      }
    } catch (error) {
      console.error('Submit candidate error:', error);
      toast.error(`Failed to ${editingCandidate ? 'update' : 'add'} candidate`);
    }
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      categoryId: candidate.categoryId._id,
      name: candidate.name,
      image: candidate.image || '',
      ballotNumber: candidate.ballotNumber,
    });
    setShowModal(true);
  };

  const handleDelete = async (candidateId: string) => {

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/elections/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Candidate deleted successfully!');
        fetchCandidates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete candidate');
      }
    } catch (error) {
      console.error('Delete candidate error:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: positions.length > 0 ? positions[0]._id : '',
      name: '',
      image: '',
      ballotNumber: 1,
    });
  };

  const groupedCandidates = candidates.reduce((acc, candidate) => {
    const positionName = candidate.categoryId?.name || 'Unknown';
    if (!acc[positionName]) {
      acc[positionName] = [];
    }
    acc[positionName].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Candidates Management</h1>
        <p className="text-gray-500 mt-1">Add and manage candidates for each position</p>
      </div>

      {/* Election Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Election</label>
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
        <>
          {positions.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                Please create positions first before adding candidates.
              </p>
            </div>
          ) : (
            <>
              {/* Add Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] transition"
                >
                  <Plus size={18} />
                  Add Candidate
                </button>
              </div>

              {/* Candidates List */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : candidates.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-[#d4af37]" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Candidates Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add candidates for each position
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37] transition"
                  >
                    <Plus size={20} />
                    Add Candidate
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedCandidates).map(([positionName, positionCandidates]) => (
                    <div key={positionName}>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">{positionName}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-4 gap-6">
                        {positionCandidates.map((candidate) => (
                          <div
                            key={candidate._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition relative"
                          >
                            {/* Ballot Number Badge */}
                            <div className="absolute top-3 left-3 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-[#d4af37]">
                              <span className="text-lg font-bold text-[#d4af37]">{candidate.ballotNumber}</span>
                            </div>

                            {candidate.image ? (
                              <div className="w-full h-60 bg-white overflow-hidden">
                                <img
                                  src={candidate.image}
                                  alt={candidate.name}
                                  className="w-full h-full object-contain object-top"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-60 bg-purple-100 flex items-center justify-center">
                                <User className="text-green-400" size={64} />
                              </div>
                            )}
                            
                            <div className="p-4">
                              <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {candidate.name}
                              </h3>
                              
                              <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-sm text-gray-500">
                                  Votes: {candidate.voteCount}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(candidate)}
                                    className="p-2 text-[#d4af37] hover:bg-purple-50 rounded-lg transition"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(candidate._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1c2338] p-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">{editingCandidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Position *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                >
                  <option value="">Select a position</option>
                  {positions.map((position) => (
                    <option key={position._id} value={position._id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name of the candidate"
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Candidate Image</label>
                <ImageUpload
                  onUploadComplete={(url) => setFormData({ ...formData, image: url })}
                  currentImage={formData.image}
                  folder="elections/candidates"
                  maxSize={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ballot Number *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.ballotNumber || 1}
                  onChange={(e) => setFormData({ ...formData, ballotNumber: parseInt(e.target.value) || 1 })}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Candidates will be displayed in ballot number order</p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCandidate(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#d4af37]"
                >
                  {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
