"use client";

import { useEffect, useState } from 'react';
import { Vote, Users, UserCheck, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ElectionDashboardPage() {
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalVoters: 0,
    totalVotes: 0,
    votedCount: 0,
    totalCandidates: 0,
    turnoutRate: 0,
  });
  const [recentElections, setRecentElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentElections();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('Fetching stats with token:', token ? 'Token exists' : 'No token');
      console.log('User data:', user);
      
      const response = await fetch('/api/elections/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stats data:', data);
        setStats(data.data);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch stats:', errorData);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentElections = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching elections...');
      
      const response = await fetch('/api/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Elections response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Elections data:', data);
        setRecentElections(data.data.slice(0, 5)); // Get latest 5 elections
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch elections:', errorData);
      }
    } catch (error) {
      console.error('Fetch elections error:', error);
    }
  };

  const getElectionStatus = (election: any) => {
    const now = new Date();
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);

    if (now > end) {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-700' };
    } else if (now >= start && now <= end) {
      return { label: 'Active', color: 'bg-green-100 text-[#D4AF37]' };
    } else {
      return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  const statCards = [
    {
      title: 'Total Elections',
      value: stats.totalElections,
      icon: Vote,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-[#D4AF37]',
    },
    {
      title: 'Active Elections',
      value: stats.activeElections,
      icon: Calendar,
      color: '#D4AF37',
      bgColor: 'bg-[#D4AF37]',
      textColor: 'text-[#1C2338]',
    },
    {
      title: 'Total Voters',
      value: stats.totalVoters,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-[#D4AF37]',
    },
    {
      title: 'Total Votes Cast',
      value: stats.votedCount,
      icon: CheckCircle,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Total Candidates',
      value: stats.totalCandidates,
      icon: UserCheck,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-[#D4AF37]',
    },
    {
      title: 'Turnout Rate',
      value: `${stats.turnoutRate}%`,
      icon: TrendingUp,
      color: 'pink',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Election Dashboard</h1>
        <p className="text-gray-500 mt-1 text-lg font-semibold">
          Manage your institutional elections and monitor voter participation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-16 h-16 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={stat.textColor} size={28} />
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-600 mb-1">{stat.title}</p>
              <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/election-dashboard/elections"
            className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
          >
            <Vote className="text-[#D4AF37]" size={28} />
            <div>
              <p className="font-medium text-xl text-gray-900">Create Election</p>
              <p className=" text-gray-600 text-md">Set up a new election</p>
            </div>
          </Link>

          <Link
            href="/election-dashboard/voters"
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <Users className="text-[#D4AF37]" size={28} />
            <div>
              <p className="font-medium text-gray-900 text-xl">Add Voters</p>
              <p className="text-md text-gray-600">Upload voter list</p>
            </div>
          </Link>

          <Link
            href="/election-dashboard/candidates"
            className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
          >
            <UserCheck className="text-[#D4AF37]" size={28} />
            <div>
              <p className="font-medium text-gray-900 text-xl">Add Candidates</p>
              <p className="text-md text-gray-600">Register candidates</p>
            </div>
          </Link>

          <Link
            href="/election-dashboard/results"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <TrendingUp className="text-[#1C2338]" size={28} />
            <div>
              <p className="font-medium text-gray-900 text-xl">View Results</p>
              <p className="text-md text-gray-600">Check live results</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className=" bg-[#1C2338]  rounded-xl shadow-sm p-8 text-white mb-8">
        <h2 className="text-2xl font-bold mb-4">Welcome to Election Management!</h2>
        <p className="text-purple-100 mb-6">
          Get started by creating your first election. Follow these simple steps:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3 font-bold">
              1
            </div>
            <p className="font-medium mb-1">Create Election</p>
            <p className="text-sm text-purple-100">Set up election details and dates</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3 font-bold">
              2
            </div>
            <p className="font-medium mb-1">Add Categories</p>
            <p className="text-sm text-purple-100">Define positions to vote for</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3 font-bold">
              3
            </div>
            <p className="font-medium mb-1">Register Candidates</p>
            <p className="text-sm text-purple-100">Add candidates for each position</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-3 font-bold">
              4
            </div>
            <p className="font-medium mb-1">Upload Voters</p>
            <p className="text-sm text-purple-100">Import voter list via CSV</p>
          </div>
        </div>
        <Link
          href="/election-dashboard/elections"
          className="inline-block mt-6 px-6 py-3 bg-white text-[#D4AF37] rounded-lg font-medium hover:bg-purple-50 transition"
        >
          Create Your First Election
        </Link>
      </div>

      {/* Recent Elections */}
      {recentElections.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Elections</h2>
              <Link
                href="/election-dashboard/elections"
                className="text-sm text-[#D4AF37] hover:text-purple-700 font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="divide-y">
            {recentElections.map((election) => {
              const status = getElectionStatus(election);
              return (
                <div
                  key={election._id}
                  className="p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {election.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      {election.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {election.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/election-dashboard/elections`}
                      className="px-4 py-2 text-[#D4AF37] hover:bg-purple-50 rounded-lg transition text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
