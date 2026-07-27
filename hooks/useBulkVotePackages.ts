import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface BulkVotePackage {
  _id: string;
  awardId: string;
  amount: number;
  votes: number;
  currency: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseBulkVotePackagesOptions {
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useBulkVotePackages = (options?: UseBulkVotePackagesOptions) => {
  const [packages, setPackages] = useState<BulkVotePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getBulkVotePackages({
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setPackages(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch packages');
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchPackages();
    }
  }, [options?.awardId, options?.page, options?.limit]);

  const createPackage = async (data: any) => {
    try {
      const response = await ApiClient.createBulkVotePackage(data);
      setPackages([...packages, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updatePackage = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateBulkVotePackage(id, data);
      setPackages(packages.map(p => p._id === id ? response.data : p));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      await ApiClient.deleteBulkVotePackage(id);
      setPackages(packages.filter(p => p._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    packages,
    loading,
    error,
    fetchPackages,
    createPackage,
    updatePackage,
    deletePackage,
  };
};
