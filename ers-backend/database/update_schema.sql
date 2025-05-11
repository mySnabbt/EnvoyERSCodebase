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