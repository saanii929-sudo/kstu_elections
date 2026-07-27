

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private static getHeaders(requireAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  static async request(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<any> {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = true,
    } = options;

    const url = `${API_URL}${endpoint}`;
    const defaultHeaders = this.getHeaders(requireAuth);

    const config: RequestInit = {
      method,
      headers: { ...defaultHeaders, ...headers },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  }

  static async login(email: string, password: string, userType: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password, userType },
      requireAuth: false,
    });
  }

  // SuperAdmin endpoints
  static async getStats() {
    return this.request('/api/superadmin/stats');
  }

  static async getOrganizations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request(`/api/superadmin/organizations${query ? `?${query}` : ''}`);
  }

  static async createOrganization(data: any) {
    return this.request('/api/superadmin/organizations', {
      method: 'POST',
      body: data,
    });
  }

  static async getOrganization(id: string) {
    return this.request(`/api/superadmin/organizations/${id}`);
  }

  static async updateOrganization(id: string, data: any) {
    return this.request(`/api/superadmin/organizations/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteOrganization(id: string) {
    return this.request(`/api/superadmin/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  static async initSuperAdmin(data: { username: string; email: string; password: string }) {
    return this.request('/api/superadmin/init', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
  }

  // Awards endpoints
  static async getAwards(params?: {
    organizationId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.append('organizationId', params.organizationId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/awards${query ? `?${query}` : ''}`);
  }

  static async getAward(id: string) {
    return this.request(`/api/awards/${id}`);
  }

  static async createAward(data: any) {
    return this.request('/api/awards', {
      method: 'POST',
      body: data,
    });
  }

  static async updateAward(id: string, data: any) {
    return this.request(`/api/awards/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteAward(id: string) {
    return this.request(`/api/awards/${id}`, {
      method: 'DELETE',
    });
  }

  static async publishAward(id: string) {
    return this.request(`/api/awards/${id}/publish`, {
      method: 'POST',
    });
  }

  // Categories endpoints
  static async getCategories(params?: {
    awardId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/categories${query ? `?${query}` : ''}`);
  }

  static async getCategory(id: string) {
    return this.request(`/api/categories/${id}`);
  }

  static async createCategory(data: any) {
    return this.request('/api/categories', {
      method: 'POST',
      body: data,
    });
  }

  static async updateCategory(id: string, data: any) {
    return this.request(`/api/categories/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteCategory(id: string) {
    return this.request(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  static async publishCategory(id: string) {
    return this.request(`/api/categories/${id}/publish`, {
      method: 'POST',
    });
  }

  // Nominees endpoints
  static async getNominees(params?: {
    categoryId?: string;
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/nominees${query ? `?${query}` : ''}`);
  }

  static async getNominee(id: string) {
    return this.request(`/api/nominees/${id}`);
  }

  static async createNominee(data: any) {
    return this.request('/api/nominees', {
      method: 'POST',
      body: data,
    });
  }

  static async updateNominee(id: string, data: any) {
    return this.request(`/api/nominees/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteNominee(id: string) {
    return this.request(`/api/nominees/${id}`, {
      method: 'DELETE',
    });
  }

  // Votes endpoints
  static async getVotes(params?: {
    nomineeId?: string;
    categoryId?: string;
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.nomineeId) searchParams.append('nomineeId', params.nomineeId);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/votes${query ? `?${query}` : ''}`);
  }

  static async getVote(id: string) {
    return this.request(`/api/votes/${id}`);
  }

  static async createVote(data: any) {
    return this.request('/api/votes', {
      method: 'POST',
      body: data,
    });
  }

  // Payments endpoints
  static async getPayments(params?: {
    awardId?: string;
    nomineeId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.nomineeId) searchParams.append('nomineeId', params.nomineeId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/payments${query ? `?${query}` : ''}`);
  }

  static async getPayment(id: string) {
    return this.request(`/api/payments/${id}`);
  }

  static async createPayment(data: any) {
    return this.request('/api/payments', {
      method: 'POST',
      body: data,
    });
  }

  // Stages endpoints
  static async getStages(params?: {
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/stages${query ? `?${query}` : ''}`);
  }

  static async getStage(id: string) {
    return this.request(`/api/stages/${id}`);
  }

  static async createStage(data: any) {
    return this.request('/api/stages', {
      method: 'POST',
      body: data,
    });
  }

  static async updateStage(id: string, data: any) {
    return this.request(`/api/stages/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteStage(id: string) {
    return this.request(`/api/stages/${id}`, {
      method: 'DELETE',
    });
  }

  // Bulk Vote Packages endpoints
  static async getBulkVotePackages(params?: {
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/bulk-vote-packages${query ? `?${query}` : ''}`);
  }

  static async getBulkVotePackage(id: string) {
    return this.request(`/api/bulk-vote-packages/${id}`);
  }

  static async createBulkVotePackage(data: any) {
    return this.request('/api/bulk-vote-packages', {
      method: 'POST',
      body: data,
    });
  }

  static async updateBulkVotePackage(id: string, data: any) {
    return this.request(`/api/bulk-vote-packages/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  static async deleteBulkVotePackage(id: string) {
    return this.request(`/api/bulk-vote-packages/${id}`, {
      method: 'DELETE',
    });
  }

  // Transfers endpoints
  static async getTransfers(params?: {
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/transfers${query ? `?${query}` : ''}`);
  }

  static async getTransfer(id: string) {
    return this.request(`/api/transfers/${id}`);
  }

  static async createTransfer(data: any) {
    return this.request('/api/transfers', {
      method: 'POST',
      body: data,
    });
  }

  // Voters endpoints
  static async getVoters(params?: {
    awardId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.awardId) searchParams.append('awardId', params.awardId);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/voters${query ? `?${query}` : ''}`);
  }

  static async getVoter(id: string) {
    return this.request(`/api/voters/${id}`);
  }

  static async createVoter(data: any) {
    return this.request('/api/voters', {
      method: 'POST',
      body: data,
    });
  }

  static async updateVoter(id: string, data: any) {
    return this.request(`/api/voters/${id}`, {
      method: 'PUT',
      body: data,
    });
  }
}

export default ApiClient;
