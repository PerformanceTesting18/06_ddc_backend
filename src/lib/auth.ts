import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { TokenPayload, AuthTokens } from '@/types'
import { PrismaClient, UserRole } from '@prisma/client'


const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production'
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

export class AuthService {
  // =========== PASSWORD OPERATIONS ===========
  
  /**
   * Hash password using bcrypt (Windows compatible)
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Use bcryptjs which works better on Windows than bcrypt
      const salt = await bcrypt.genSalt(12) // Higher salt rounds for better security
      return await bcrypt.hash(password, salt)
    } catch (error) {
      console.error('Password hashing error:', error)
      throw new Error('Failed to hash password')
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      console.error('Password verification error:', error)
      throw new Error('Failed to verify password')
    }
  }

  // =========== TOKEN OPERATIONS ===========
  
  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: TokenPayload): string {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256'
      })
    } catch (error) {
      console.error('Access token generation error:', error)
      throw new Error('Failed to generate access token')
    }
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(payload: TokenPayload): string {
    try {
      return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256'
      })
    } catch (error) {
      console.error('Refresh token generation error:', error)
      throw new Error('Failed to generate refresh token')
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      console.error('Access token verification error:', error)
      return null
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
    } catch (error) {
      console.error('Refresh token verification error:', error)
      return null
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload
    } catch (error) {
      console.error('Token decoding error:', error)
      return null
    }
  }

  // =========== SESSION MANAGEMENT ===========
  
  /**
   * Create new session for user
   */
  static async createSession(userId: string, refreshToken: string, deviceInfo?: any) {
    try {
      // Decode token to get expiry
      const decoded = this.decodeToken(refreshToken)
      if (!decoded) throw new Error('Invalid token')

      // Calculate expiry date (7 days from now or from token)
      const expires = new Date()
      expires.setDate(expires.getDate() + 7)

      // Create session in database
      return await prisma.session.create({
        data: {
          user_id: userId,
          token: refreshToken,
          expires,
          device_info: deviceInfo || { 
            userAgent: 'Unknown',
            ip: '127.0.0.1'
          }
        }
      })
    } catch (error) {
      console.error('Create session error:', error)
      throw new Error('Failed to create session')
    }
  }

  /**
   * Get session by token
   */
  static async getSession(token: string) {
    try {
      return await prisma.session.findUnique({
        where: { token },
        include: { user: true }
      })
    } catch (error) {
      console.error('Get session error:', error)
      throw new Error('Failed to get session')
    }
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(token: string) {
    try {
      return await prisma.session.delete({
        where: { token }
      })
    } catch (error) {
      console.error('Delete session error:', error)
      throw new Error('Failed to delete session')
    }
  }

  /**
   * Delete all sessions for user
   */
  static async deleteAllUserSessions(userId: string) {
    try {
      return await prisma.session.deleteMany({
        where: { user_id: userId }
      })
    } catch (error) {
      console.error('Delete all sessions error:', error)
      throw new Error('Failed to delete user sessions')
    }
  }

  // =========== USER OPERATIONS ===========
  
  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password_hash: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          is_active: true
        }
      })
    } catch (error) {
      console.error('Get user by email error:', error)
      throw new Error('Failed to get user')
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      })
    } catch (error) {
      console.error('Get user by ID error:', error)
      throw new Error('Failed to get user')
    }
  }

  /**
   * Create new user
   */
  static async createUser(userData: {
    email: string
    password_hash: string
    first_name: string
    last_name: string
    phone?: string
    role?: UserRole
  }) {
    try {
      return await prisma.user.create({
        data: {
          email: userData.email,
          password_hash: userData.password_hash,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          role: userData.role ?? UserRole.USER
        },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
          created_at: true
        }
      })
    } catch (error) {
      console.error('Create user error:', error)
      throw new Error('Failed to create user')
    }
  }

  // =========== HELPER METHODS ===========
  
  /**
   * Generate tokens for user
   */
  static async generateTokensForUser(user: any): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    }

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    }
  }

  /**
   * Extract token from request headers
   */
  static extractTokenFromHeader(headers: Headers): string | null {
    const authHeader = headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  /**
   * Validate user is active
   */
  static validateUserActive(user: any): boolean {
    return user.is_active === true
  }
}