-- Add new columns to the schedules table for request-approval workflow
ALTER TABLE schedules 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN requested_by UUID REFERENCES users(id),
ADD COLUMN approved_by UUID REFERENCES users(id),
ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT;

-- Create index for faster lookups
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_requested_by ON schedules(requested_by);

-- Update the updatable columns in schedules (for the trigger)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a view for pending schedule requests
CREATE OR REPLACE VIEW pending_schedule_requests AS
SELECT 
  s.id, 
  s.employee_id, 
  e.name AS employee_name,
  s.date, 
  s.start_time, 
  s.end_time, 
  s.notes,
  s.requested_by,
  u.name AS requested_by_name,
  s.created_at
FROM 
  schedules s
JOIN
  employees e ON s.employee_id = e.id
JOIN
  users u ON s.requested_by = u.id
WHERE 
  s.status = 'pending'
ORDER BY
  s.created_at DESC; 