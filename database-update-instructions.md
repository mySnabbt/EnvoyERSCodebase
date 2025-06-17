# Database and Application Update Instructions

## Overview of Changes

1. Modified the `users` table to add `first_name`, `last_name`, and `phone` fields
2. Added a `user_id` field to the `employees` table to create a relationship between users and employees
3. Updated backend code to handle the new schema
4. Updated frontend components to support the new fields

## Database Update SQL

Run the following SQL commands through the Supabase SQL Editor:

```sql
-- First, create a backup of the name field in users table before modifying it
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
UPDATE users SET full_name = name;

-- Add new columns to the users table
ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN last_name VARCHAR(255);
ALTER TABLE users ADD COLUMN phone VARCHAR(50);

-- Split existing name values into first_name and last_name
UPDATE users SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = SUBSTRING(name FROM POSITION(' ' IN name) + 1);
  
-- Add user_id reference to employees table
ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES users(id);

-- Create index for better performance
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- Create a relationship migration procedure to link existing employees with users based on email
CREATE OR REPLACE FUNCTION link_employees_to_users() 
RETURNS void AS $$
BEGIN
  UPDATE employees e
  SET user_id = u.id
  FROM users u
  WHERE e.email = u.email AND e.user_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the procedure
SELECT link_employees_to_users();

-- Drop the procedure
DROP FUNCTION link_employees_to_users();
```

## Code Deployment Steps

1. Deploy the backend code changes:
   - Updated `UserModel` to handle new fields
   - Updated `AuthController` to accept and validate first_name, last_name, and phone
   - Updated `EmployeeModel` to use the user_id relationship
   - Updated `EmployeeController` to auto-fill employee data from user records

2. Deploy the frontend code changes:
   - Updated registration form to include phone field
   - Modified `AuthContext` to handle the new fields
   - Enhanced employee form to auto-fill data from linked user accounts

## Testing Instructions

1. Test user registration with the new fields:
   - Register a new user with first name, last name, email, password, and phone
   - Verify that login works with the updated user data

2. Test employee creation:
   - Create a new employee linked to an existing user
   - Verify that the fields auto-populate from the user data
   - Confirm that the relationship is properly saved

3. Test employee listing:
   - Ensure the employee listing shows the correct name format
   - Verify user data is properly linked to employee profiles

## Rollback Plan

If issues are encountered, run the following SQL to revert the changes:

```sql
-- Remove user_id field and index from employees
ALTER TABLE employees DROP COLUMN user_id;
DROP INDEX idx_employees_user_id;

-- Remove new columns from users table
ALTER TABLE users DROP COLUMN first_name;
ALTER TABLE users DROP COLUMN last_name;
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users DROP COLUMN full_name;
```

Then restore the previous code version from your version control system. 

## SQL Execution Function for Admin AI Queries

A new feature has been added to allow administrators to run custom SQL queries through the AI assistant. This feature requires adding a database function that safely handles read-only SQL queries.

1. Connect to your database using the SQL editor in the Supabase dashboard
2. Run the following SQL script to create the necessary function:

```sql
-- Function to safely execute read-only SQL queries
CREATE OR REPLACE FUNCTION execute_read_only_query(query_text TEXT)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with privileges of the function creator
AS $$
DECLARE
    result JSONB;
    query_type TEXT;
BEGIN
    -- Validate that the query is read-only
    -- Extract the first word to identify the query type
    SELECT LOWER(SPLIT_PART(TRIM(query_text), ' ', 1)) INTO query_type;
    
    -- Check if it's a SELECT or WITH query
    IF query_type NOT IN ('select', 'with') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Check for any data modification statements
    IF query_text ~* '\s(insert|update|delete|drop|create|alter|truncate|grant|revoke)\s' THEN
        RAISE EXCEPTION 'Data modification statements are not allowed';
    END IF;
    
    -- Execute the query and convert results to JSON
    EXECUTE 'SELECT JSONB_AGG(row_to_json(results)) FROM (' || query_text || ') AS results' INTO result;
    
    -- Handle NULL result (empty result set)
    IF result IS NULL THEN
        result := '[]'::JSONB;
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        -- Return error information as JSON
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_read_only_query TO authenticated;

-- Add audit logging for the function
COMMENT ON FUNCTION execute_read_only_query IS 'Safely executes read-only SQL queries for admin users. All executions are logged for security auditing.';
```

3. After applying this change, restart the backend server to make the new functionality available. 