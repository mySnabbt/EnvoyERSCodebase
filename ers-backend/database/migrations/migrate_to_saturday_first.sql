-- Migrate to Monday-first (updating from previous setting)
-- Only run this once!

-- First create the system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_day_of_week INTEGER NOT NULL DEFAULT 1, -- 1=Monday
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert settings with Monday (1) as first day if not exists
INSERT INTO system_settings (first_day_of_week)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Update any existing settings to use Monday (1) as first day
UPDATE system_settings SET first_day_of_week = 1;

-- Create the migration function if it doesn't exist
CREATE OR REPLACE FUNCTION update_day_of_week_values(old_first_day INT, new_first_day INT)
RETURNS VOID AS $$
DECLARE
  slot RECORD;
BEGIN
  -- Output migration information
  RAISE NOTICE 'Migrating time_slots from old_first_day=% to new_first_day=%', old_first_day, new_first_day;
  
  -- Loop through each time slot
  FOR slot IN SELECT id, day_of_week FROM time_slots LOOP
    -- Calculate new day of week value
    -- First convert to JavaScript day (0-6), then apply the new first day offset
    DECLARE
      js_day_of_week INT;
      new_day_of_week INT;
    BEGIN
      -- Convert from old system to JavaScript days
      js_day_of_week := (slot.day_of_week + old_first_day) % 7;
      
      -- Convert from JavaScript days to new system
      new_day_of_week := (js_day_of_week - new_first_day + 7) % 7;
      
      RAISE NOTICE 'Time slot ID: %, Old day: %, JS day: %, New day: %', 
        slot.id, slot.day_of_week, js_day_of_week, new_day_of_week;
      
      -- Update the time slot with the new day of week
      UPDATE time_slots SET day_of_week = new_day_of_week WHERE id = slot.id;
    END;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Run the migration from previous setting to Monday-first (1)
SELECT update_day_of_week_values(6, 1);

-- If you're using a different previous system, use appropriate value:
-- SELECT update_day_of_week_values(0, 1); -- Sunday-first to Monday-first

-- Update any scheduled events to align with the new day values
-- This ensures existing schedules are displayed on the correct days
UPDATE schedules
SET date = date + (SELECT first_day_of_week FROM system_settings LIMIT 1) * INTERVAL '1 day'
WHERE status = 'pending'; -- Only update pending schedules for safety

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'Migration to Monday-first completed';
END $$; 