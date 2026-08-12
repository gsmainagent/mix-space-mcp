export interface Pagination {
  total: number
  current_page: number
  total_page: number
  size: number
  has_next_page: boolean
  has_prev_page: boolean
}

export interface PaginatedResponse<T = unknown> {
  data: T[]
  pagination?: Pagination
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}
