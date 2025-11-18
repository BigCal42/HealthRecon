export interface PageParams {
  page?: number; // 1-based
  pageSize?: number; // default 20
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

