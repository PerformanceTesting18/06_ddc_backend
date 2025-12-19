import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'
import { ApiResponseHandler } from '@/utils/api-response'
import { logoutSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validationResult = logoutSchema.safeParse(body)
    
    if (!validationResult.success) {
      return ApiResponseHandler.validationError(validationResult.error.errors)
    }
    
    const { refreshToken: bodyToken } = validationResult.data
    
    // Get token from body or cookie
    let tokenToInvalidate = bodyToken
    
    if (!tokenToInvalidate) {
      // Try to get from cookie
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
          const [name, value] = cookie.trim().split('=')
          acc[name] = value
          return acc
        }, {})
        tokenToInvalidate = cookies.refreshToken
      }
    }
    
    // Also get access token from header
    const accessToken = AuthService.extractTokenFromHeader(request.headers)
    
    if (!tokenToInvalidate && !accessToken) {
      return ApiResponseHandler.success(null, 'Logout successful (no active session)')
    }
    
    // If we have a refresh token, delete the session
    if (tokenToInvalidate) {
      try {
        await AuthService.deleteSession(tokenToInvalidate)
      } catch (error) {
        // Session might not exist, that's okay
        console.log('Session not found during logout:', error)
      }
    }
    
    // Create response
    const response = ApiResponseHandler.success(
      null,
      'Logout successful'
    )
    
    // Clear refresh token cookie
    response.headers.append(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict'
    )
    
    return response
    
  } catch (error: any) {
    console.error('Logout error:', error)
    
    return ApiResponseHandler.error(
      'Logout failed',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}