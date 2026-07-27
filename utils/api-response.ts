export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export const successResponse = <T = any>(
  message: string,
  data?: T
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const errorResponse = (message: string): ApiResponse => ({
  success: false,
  message,
});

export const paginatedResponse = <T>(
  message: string,
  data: T[],
  pagination: PaginationMeta
): PaginatedApiResponse<T> => ({
  success: true,
  message,
  data,
  pagination,
});
