import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'
import { ApiResponseHandler } from '@/utils/api-response'

export async function GET(request: NextRequest) {
  try {
    /* ===============================
       1. Extract Authorization header
    ================================ */
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponseHandler.unauthorized(
        'Authorization header missing or malformed'
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return ApiResponseHandler.unauthorized('Access token not provided')
    }

    /* ===============================
       2. Verify access token
    ================================ */
    const payload = AuthService.verifyAccessToken(token)

    if (!payload || !payload.userId) {
      return ApiResponseHandler.unauthorized('Invalid or expired access token')
    }

    /* ===============================
       3. Fetch user from DB
    ================================ */
    const user = await AuthService.getUserById(payload.userId)

    if (!user) {
      return ApiResponseHandler.notFound('User not found')
    }

    /* ===============================
       4. Check user active status
    ================================ */
    if (!AuthService.validateUserActive(user)) {
      return ApiResponseHandler.forbidden('Account is deactivated')
    }

    /* ===============================
       5. Send success response
    ================================ */
    return ApiResponseHandler.success(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      },
      'User profile retrieved successfully'
    )
  } catch (error) {
    console.error('GET /api/auth/me error:', error)

    return ApiResponseHandler.error(
      'Failed to get user profile',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}

/* ===============================
   OPTIONS (CORS)
================================ */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
