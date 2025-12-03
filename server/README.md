# EVA App Backend Server

Express.js + MongoDB + TypeScript backend for the EVA mobile application.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the server directory with the following:
```
# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d

# CORS Configuration
CLIENT_URL=http://localhost:8081
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## Project Structure

```
server/
├── src/
│   ├── controllers/
│   │   └── authController.ts      # Authentication logic (register, login)
│   ├── middleware/
│   │   └── authMiddleware.ts      # JWT authentication middleware
│   ├── models/
│   │   └── User.ts                # MongoDB User schema
│   ├── routes/
│   │   └── authRoutes.ts          # Authentication routes
│   └── server.ts                  # Main server entry point
├── .env                           # Environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. Register User
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "User registered successfully",
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```

#### 2. Login User
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```

#### 3. Get Current User
- **GET** `/api/auth/me`
- **Headers:**
  ```
  Authorization: Bearer jwt_token_here
  ```
- **Response:**
  ```json
  {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```

## Dependencies

### Production Dependencies
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation
- **dotenv** - Environment variables
- **cors** - CORS middleware
- **express-validator** - Input validation
- **helmet** - Security headers

### Development Dependencies
- **typescript** - TypeScript compiler
- **ts-node** - Run TypeScript directly
- **nodemon** - Auto-restart on file changes
- **@types/** - Type definitions
- **jest** - Testing framework
- **ts-jest** - Jest TypeScript support

## Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT token authentication
- CORS protection
- Helmet security headers
- Input validation with express-validator
- Email and password validation
- MongoDB injection prevention via Mongoose schema

## MongoDB Schema

### User Model
```typescript
{
  name: String (required, min 2 chars)
  email: String (required, unique, lowercase, valid email format)
  password: String (required, min 6 chars, hashed)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `201` - Resource created (register)
- `200` - Success (login, get user)
- `400` - Bad request (validation errors)
- `401` - Unauthorized (invalid credentials, no token)
- `404` - Not found (user not found)
- `500` - Server error

## Testing

```bash
npm test
```

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] User profile updates
- [ ] Device/session management
- [ ] Rate limiting
- [ ] Logging system
- [ ] Error tracking (Sentry)
