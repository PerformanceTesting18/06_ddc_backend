import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth'
import { ApiResponseHandler } from '@/utils/api-response'
import { registerSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    
    if (!validationResult.success) {
      return ApiResponseHandler.validationError(validationResult.error.errors)
    }
    
    const { email, password, firstName, lastName, phone, role } = validationResult.data
    
    // Check if user already exists
    const existingUser = await AuthService.getUserByEmail(email)
    
    if (existingUser) {
      return ApiResponseHandler.conflict('User with this email already exists')
    }
    
    // Hash password
    const passwordHash = await AuthService.hashPassword(password)
    
    // Create user
    const user = await AuthService.createUser({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone: phone || undefined,
      role
    })
    
    // Generate tokens
    const tokens = await AuthService.generateTokensForUser(user)
    
    // Create session
    await AuthService.createSession(user.id, tokens.refreshToken, {
      userAgent: request.headers.get('user-agent') || 'Unknown',
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })
    
    // Prepare response data
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at
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
      'Registration successful',
      201
    )
    
    // Set refresh token as HTTP-only cookie (optional)
    response.headers.append(
      'Set-Cookie',
      `refreshToken=${tokens.refreshToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict`
    )
    
    return response
    
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return ApiResponseHandler.conflict('User with this email already exists')
    }
    
    return ApiResponseHandler.error(
      'Registration failed',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}

// Handle OPTIONS request for CORS
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