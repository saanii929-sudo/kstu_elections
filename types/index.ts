// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'organization';
}

export interface Admin {
  _id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  logo?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LoginResponse extends ApiResponse {
  token: string;
  user: User;
}

export interface StatsResponse extends ApiResponse {
  data: {
    organizations: {
      total: number;
      active: number;
      inactive: number;
      suspended: number;
    };
    admins: {
      total: number;
    };
    recentOrganizations: Organization[];
  };
}

// Form types
export interface OrganizationFormData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface LoginFormData {
  email: string;
  password: string;
  userType: 'superadmin' | 'admin' | 'organization';
}

export {};
