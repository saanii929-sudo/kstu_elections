import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Vote {
  _id: string;
  nomineeId: string;
  categoryId: string;
  awardId: string;
  voterId: string;
  voteCount: number;
  amount: number;
  status: 'successful' | 'pending' | 'failed';
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseVotesOptions {
  nomineeId?: string;
  categoryId?: string;
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useVotes = (options?: UseVotesOptions) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getVotes({
        nomineeId: options?.nomineeId,
        categoryId: options?.categoryId,
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setVotes(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch votes');
      console.error('Error fetching votes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchVotes();
    }
  }, [options?.nomineeId, options?.categoryId, options?.awardId, options?.page, options?.limit]);

  const createVote = async (data: any) => {
    try {
      const response = await ApiClient.createVote(data);
      setVotes([...votes, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    votes,
    loading,
    error,
    fetchVotes,
    createVote,
  };
};
