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