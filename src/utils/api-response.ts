import { ApiResponse } from '@/types'

export class ApiResponseHandler {
  static success<T>(data?: T, message: string = 'Success', statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  static error(message: string = 'An error occurred', statusCode: number = 500, error?: any): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: error?.message || message,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  static validationError(errors: any): Response {
    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      error: errors,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  static unauthorized(message: string = 'Unauthorized'): Response {
    return this.error(message, 401)
  }

  static forbidden(message: string = 'Forbidden'): Response {
    return this.error(message, 403)
  }

  static notFound(message: string = 'Not found'): Response {
    return this.error(message, 404)
  }

  static conflict(message: string = 'Conflict'): Response {
    return this.error(message, 409)
  }
}