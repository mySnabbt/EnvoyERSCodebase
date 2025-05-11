# Employee Roster System Backend

A Node.js REST API backend for an Employee Roster System that manages employees, departments, and work schedules.

## Technologies Used

- Node.js & Express.js
- Supabase (PostgreSQL database)
- JWT Authentication
- bcrypt for password hashing

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ers-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   JWT_SECRET=your_jwt_secret_key
   ```

4. Set up the database:
   - Create a new Supabase project
   - Navigate to the SQL editor in your Supabase dashboard
   - Copy and run the SQL from the `database/schema.sql` file

### Running the Application

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info (authenticated)

### Employees
- `GET /api/employees` - Get all employees (authenticated)
- `GET /api/employees/:id` - Get employee by ID (authenticated)
- `POST /api/employees` - Create a new employee (authenticated)
- `PUT /api/employees/:id` - Update an employee (authenticated)
- `DELETE /api/employees/:id` - Delete an employee (authenticated)
- `GET /api/employees/department/:departmentId` - Get employees by department (authenticated)

### Departments
- `GET /api/departments` - Get all departments (authenticated)
- `GET /api/departments/:id` - Get department by ID (authenticated)
- `POST /api/departments` - Create a new department (authenticated)
- `PUT /api/departments/:id` - Update a department (authenticated)
- `DELETE /api/departments/:id` - Delete a department (authenticated)

### Schedules
- `GET /api/schedules` - Get all schedules with optional filters (authenticated)
- `GET /api/schedules/:id` - Get schedule by ID (authenticated)
- `GET /api/schedules/employee/:employeeId` - Get schedules by employee ID (authenticated)
- `POST /api/schedules` - Create a new schedule (authenticated)
- `PUT /api/schedules/:id` - Update a schedule (authenticated)
- `DELETE /api/schedules/:id` - Delete a schedule (authenticated)

## Project Structure

```
ers-backend/
├── src/
│   ├── config/        # Configuration files
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Custom middleware
│   ├── models/        # Data models
│   ├── routes/        # API routes
│   └── index.js       # Entry point
├── database/
│   └── schema.sql     # Database schema
├── .env               # Environment variables
├── package.json
└── README.md
``` 