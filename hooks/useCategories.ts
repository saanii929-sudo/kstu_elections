import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Category {
  _id: string;
  awardId: string;
  name: string;
  description: string;
  nomineeCount: number;
  voteCount: number;
  published: boolean;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface UseCategoriesOptions {
  awardId?: string;
  status?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useCategories = (options?: UseCategoriesOptions) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getCategories({
        awardId: options?.awardId,
        status: options?.status,
        page: options?.page,
        limit: options?.limit,
      });
      setCategories(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchCategories();
    }
  }, [options?.awardId, options?.status, options?.page, options?.limit]);

  const createCategory = async (data: any) => {
    try {
      const response = await ApiClient.createCategory(data);
      setCategories([...categories, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateCategory = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateCategory(id, data);
      setCategories(categories.map(c => c._id === id ? response.data : c));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await ApiClient.deleteCategory(id);
      setCategories(categories.filter(c => c._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const publishCategory = async (id: string) => {
    try {
      const response = await ApiClient.publishCategory(id);
      setCategories(categories.map(c => c._id === id ? response.data : c));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    publishCategory,
  };
};
