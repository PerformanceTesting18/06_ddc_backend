// User types
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  role: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface UserCreateInput {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  role?: string
}

export interface UserLoginInput {
  email: string
  password: string
}

// Token types
export interface TokenPayload {
  userId: string
  email: string
  role: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  timestamp: string
}

// Request types for Next.js API routes
export interface NextApiRequestWithUser extends Request {
  user?: TokenPayload
}