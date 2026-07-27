import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Voter {
  _id: string;
  awardId: string;
  email: string;
  name: string;
  voteCount: number;
  totalSpent: number;
  status: 'active' | 'banned' | 'inactive';
  lastVotedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseVotersOptions {
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useVoters = (options?: UseVotersOptions) => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getVoters({
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setVoters(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch voters');
      console.error('Error fetching voters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchVoters();
    }
  }, [options?.awardId, options?.page, options?.limit]);

  const createVoter = async (data: any) => {
    try {
      const response = await ApiClient.createVoter(data);
      setVoters([...voters, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateVoter = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateVoter(id, data);
      setVoters(voters.map(v => v._id === id ? response.data : v));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    voters,
    loading,
    error,
    fetchVoters,
    createVoter,
    updateVoter,
  };
};
