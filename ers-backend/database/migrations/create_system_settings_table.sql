-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_day_of_week INTEGER NOT NULL DEFAULT 0, -- 0=Sunday by default
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO system_settings (first_day_of_week)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Migration function to update day_of_week values in time_slots when first_day_of_week changes
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

-- Example usage:
-- SELECT update_day_of_week_values(0, 1); -- Migrate from Sunday-first to Monday-first
-- SELECT update_day_of_week_values(1, 0); -- Migrate from Monday-first to Sunday-first
-- SELECT update_day_of_week_values(0, 6); -- Migrate from Sunday-first to Saturday-first 