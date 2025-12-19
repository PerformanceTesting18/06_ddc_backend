import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/favicon.ico'
]

// Paths that require specific roles
const ROLE_PATHS: Record<string, string[]> = {
  '/api/admin': ['ADMIN'],
  '/api/veterinary': ['VETERINARY', 'ADMIN'],
  '/api/receptionist': ['RECEPTIONIST', 'ADMIN'],
  '/api/trainer': ['TRAINER', 'ADMIN'],
  '/api/driver': ['DRIVER', 'ADMIN']
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )
  
  if (isPublicPath) {
    return NextResponse.next()
  }
  
  // Extract token from header
  const token = AuthService.extractTokenFromHeader(request.headers)
  
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication required',
        error: 'No token provided'
      },
      { status: 401 }
    )
  }
  
  // Verify token
  const payload = AuthService.verifyAccessToken(token)
  
  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication failed',
        error: 'Invalid or expired token'
      },
      { status: 401 }
    )
  }
  
  // Check if user is active (optional - could fetch from DB)
  // For performance, we trust the token payload
  
  // Check role-based access
  const requiredRoles = getRequiredRolesForPath(pathname)
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Access denied',
        error: 'Insufficient permissions'
      },
      { status: 403 }
    )
  }
  
  // Add user info to request headers for API routes
  const headers = new Headers(request.headers)
  headers.set('x-user-id', payload.userId)
  headers.set('x-user-email', payload.email)
  headers.set('x-user-role', payload.role)
  
  // Clone the request with new headers
  const response = NextResponse.next({
    request: {
      headers
    }
  })
  
  return response
}

function getRequiredRolesForPath(pathname: string): string[] {
  for (const [path, roles] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(path)) {
      return roles
    }
  }
  return [] // No specific role required
}

// Helper function to check if user has required role
export function requireRole(allowedRoles: string[]) {
  return function (request: NextRequest) {
    const role = request.headers.get('x-user-role')
    
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Access denied',
          error: 'Insufficient permissions'
        },
        { status: 403 }
      )
    }
    
    return NextResponse.next()
  }
}