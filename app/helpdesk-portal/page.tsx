"use client";

import { useEffect, useState } from 'react';
import { Search, Mail, Phone, User, Calendar, CheckCircle, XCircle, LogOut } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Voter {
  _id: string;
  name: string;
  email: string;
  phone: string;
  voterId: string;
  hasVoted: boolean;
  electionId: {
    _id: string;
    title: string;
  };
  metadata?: {
    department?: string;
    class?: string;
  };
  createdAt: string;
}

export default function HelpdeskPortalPage() {
  const router = useRouter();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [helpdeskUser, setHelpdeskUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('helpdeskToken');
    const userData = localStorage.getItem('helpdeskUser');
    
    if (!token || !userData) {
      router.push('/helpdesk-login');
      return;
    }

    const user = JSON.parse(userData);
    setHelpdeskUser(user);
    
    if (!user.assignedElections || user.assignedElections.length === 0) {
      toast.error('No elections assigned to your account');
      return;
    }
    
    fetchVoters();
  }, [router]);

  const fetchVoters = async () => {
    try {
      const token = localStorage.getItem('helpdeskToken');
      const response = await fetch('/api/helpdesk/voters', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVoters(data.data || []);
      } else if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch voters:', error);
      toast.error('Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCredentials = async (voterId: string) => {
    setResendingId(voterId);

    try {
      const token = localStorage.getItem('helpdeskToken');
      const response = await fetch(`/api/helpdesk/voters/${voterId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Credentials resent successfully!');
      } else {
        toast.error(data.error || 'Failed to resend credentials');
      }
    } catch (error) {
      console.error('Failed to resend credentials:', error);
      toast.error('Failed to resend credentials');
    } finally {
      setResendingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('helpdeskToken');
    localStorage.removeItem('helpdeskUser');
    router.push('/helpdesk-login');
  };

  const filteredVoters = voters.filter(voter =>
    voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voter.phone.includes(searchTerm) ||
    voter.voterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Toaster position="top-center" />
      
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Help Desk Portal</h1>
                <p className="text-xs sm:text-sm text-gray-500">Assist voters with credential issues</p>
                {helpdeskUser && helpdeskUser.assignedElections && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {helpdeskUser.assignedElections.map((election: any) => (
                      <span
                        key={election._id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {election.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                {helpdeskUser && (
                  <div className="text-left sm:text-right min-w-0 flex-1 sm:flex-initial">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{helpdeskUser.username}</p>
                    <p className="text-xs text-gray-500 truncate hidden sm:block">{helpdeskUser.email}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex-shrink-0 text-sm"
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Exit</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or voter ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading voters...</p>
              </div>
            ) : filteredVoters.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">
                  {searchTerm ? 'No voters found' : 'No voters available'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-4">
                  {filteredVoters.map((voter) => (
                    <div key={voter._id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{voter.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{voter.voterId}</p>
                          {voter.metadata?.department && (
                            <p className="text-xs text-gray-500 mt-1">
                              {voter.metadata.department}
                              {voter.metadata.class && ` - ${voter.metadata.class}`}
                            </p>
                          )}
                        </div>
                        {voter.hasVoted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex-shrink-0">
                            <CheckCircle size={12} />
                            Voted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex-shrink-0">
                            <XCircle size={12} />
                            Not Voted
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="flex-shrink-0" />
                          <span className="truncate">{voter.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} className="flex-shrink-0" />
                          <span>{voter.phone}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500 mb-2">{voter.electionId.title}</p>
                        <button
                          onClick={() => handleResendCredentials(voter._id)}
                          disabled={voter.hasVoted || resendingId === voter._id}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <Mail size={16} />
                          <span>
                            {resendingId === voter._id ? 'Sending...' : 'Resend Credentials'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Voter Info</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Election</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVoters.map((voter) => (
                      <tr key={voter._id} className="border-t hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{voter.name}</p>
                            <p className="text-sm text-gray-500 font-mono">{voter.voterId}</p>
                            {voter.metadata?.department && (
                              <p className="text-xs text-gray-500 mt-1">
                                {voter.metadata.department}
                                {voter.metadata.class && ` - ${voter.metadata.class}`}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail size={14} />
                              <span>{voter.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={14} />
                              <span>{voter.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-900">{voter.electionId.title}</p>
                        </td>
                        <td className="py-4 px-4">
                          {voter.hasVoted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle size={14} />
                              Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              <XCircle size={14} />
                              Not Voted
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleResendCredentials(voter._id)}
                            disabled={voter.hasVoted || resendingId === voter._id}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            <Mail size={16} />
                            <span>
                              {resendingId === voter._id ? 'Sending...' : 'Resend'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
