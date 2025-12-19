import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'
import { ApiResponseHandler } from '@/utils/api-response'
import { refreshTokenSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validationResult = refreshTokenSchema.safeParse(body)
    
    if (!validationResult.success) {
      return ApiResponseHandler.validationError(validationResult.error.errors)
    }
    
    const { refreshToken: bodyToken } = validationResult.data
    
    // Get token from body or cookie
    let refreshToken = bodyToken
    
    if (!refreshToken) {
      // Try to get from cookie
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
          const [name, value] = cookie.trim().split('=')
          acc[name] = value
          return acc
        }, {})
        refreshToken = cookies.refreshToken
      }
    }
    
    if (!refreshToken) {
      return ApiResponseHandler.unauthorized('Refresh token is required')
    }
    
    // Verify refresh token
    const payload = AuthService.verifyRefreshToken(refreshToken)
    
    if (!payload) {
      return ApiResponseHandler.unauthorized('Invalid or expired refresh token')
    }
    
    // Check if session exists
    const session = await AuthService.getSession(refreshToken)
    
    if (!session) {
      return ApiResponseHandler.unauthorized('Session not found')
    }
    
    // Check if session is expired
    if (new Date() > session.expires) {
      await AuthService.deleteSession(refreshToken)
      return ApiResponseHandler.unauthorized('Session expired')
    }
    
    // Check if user is active
    if (!AuthService.validateUserActive(session.user)) {
      await AuthService.deleteSession(refreshToken)
      return ApiResponseHandler.forbidden('Account is deactivated')
    }
    
    // Generate new access token
    const newAccessToken = AuthService.generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role
    })
    
    // Prepare response
    const responseData = {
      accessToken: newAccessToken,
      expiresIn: 900 // 15 minutes in seconds
    }
    
    return ApiResponseHandler.success(
      responseData,
      'Token refreshed successfully'
    )
    
  } catch (error: any) {
    console.error('Token refresh error:', error)
    
    return ApiResponseHandler.error(
      'Token refresh failed',
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