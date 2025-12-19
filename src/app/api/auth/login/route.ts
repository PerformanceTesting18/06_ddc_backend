import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'
import { ApiResponseHandler } from '@/utils/api-response'
import { loginSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    
    if (!validationResult.success) {
      return ApiResponseHandler.validationError(validationResult.error.errors)
    }
    
    const { email, password } = validationResult.data
    
    // Get user by email
    const user = await AuthService.getUserByEmail(email)
    
    if (!user) {
      return ApiResponseHandler.unauthorized('Invalid email or password')
    }
    
    // Check if user is active
    if (!AuthService.validateUserActive(user)) {
      return ApiResponseHandler.forbidden('Account is deactivated. Please contact support.')
    }
    
    // Verify password
    const isPasswordValid = await AuthService.verifyPassword(password, user.password_hash)
    
    if (!isPasswordValid) {
      return ApiResponseHandler.unauthorized('Invalid email or password')
    }
    
    // Generate tokens
    const tokens = await AuthService.generateTokensForUser(user)
    
    // Create or update session
    await AuthService.createSession(user.id, tokens.refreshToken, {
      userAgent: request.headers.get('user-agent') || 'Unknown',
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })
    
    // Prepare response data (exclude password hash)
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    }
    
    // Create response
    const response = ApiResponseHandler.success(
      responseData,
      'Login successful'
    )
    
    // Set refresh token as HTTP-only cookie (optional)
    response.headers.append(
      'Set-Cookie',
      `refreshToken=${tokens.refreshToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
    )
    
    return response
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    return ApiResponseHandler.error(
      'Login failed',
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