-- Create time_slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), 
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_slot_range CHECK (start_time < end_time),
  UNIQUE (day_of_week, start_time, end_time)
);

-- Create time_slot_limits table for employee limits per time slot
CREATE TABLE IF NOT EXISTS time_slot_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  max_employees INTEGER NOT NULL DEFAULT 1 CHECK (max_employees > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(time_slot_id)
);

-- Update schedules table to include time_slot_id and week reference
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES time_slots(id),
ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_schedules_time_slot ON schedules(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedules_week ON schedules(week_start_date);

-- Add triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_time_slots_updated_at
BEFORE UPDATE ON time_slots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_time_slot_limits_updated_at
BEFORE UPDATE ON time_slot_limits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 