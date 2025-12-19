# Authentication API Documentation

## Base URL
http://localhost:3000/api
## Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "USER" // Optional, defaults to USER
}