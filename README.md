# Employee Record System (ERS)

A full-stack web application for managing employee records, departments, and schedules.

## Project Structure

This repository contains both frontend and backend code:

- **ers-frontend**: React-based frontend application
- **ers-backend**: Node.js backend API with Express

## Features

- User authentication and role-based access control (Admin/Employee)
- Employee management with full CRUD operations
- Department organization
- User management for administrators
- Profile management for employees

## Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL database (using Supabase)

## Setup Instructions

### Backend Setup

1. Navigate to the backend folder:
   ```
   cd ers-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `ers-backend` directory with the following variables:
   ```
   PORT=5000
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   JWT_SECRET=your_jwt_secret
   ```

4. Initialize the database by running the SQL scripts in the `database` folder

5. Start the backend server:
   ```
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```
   cd ers-frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the frontend development server:
   ```
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user info

### Employees

- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Departments

- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `POST /api/departments` - Create new department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### User Management (Admin only)

- `GET /api/auth/users` - Get all users
- `GET /api/auth/users/without-employee` - Get users without employee profiles
- `PATCH /api/auth/users/:userId/role` - Update user role

## Database Schema

The system uses the following database tables:

- **users**: Authentication and user information
- **employees**: Employee profiles linked to user accounts
- **departments**: Department information
- **schedules**: Employee schedules

## Development Workflow

1. Backend changes should include appropriate tests
2. Frontend components follow a modular structure
3. Ensure proper error handling and validation

## Security Considerations

- Environment variables are used for sensitive configuration
- JWT authentication secures all API endpoints
- Role-based access controls are enforced

## License

[MIT License](LICENSE)

## Contributors

- Your Name - Initial work 