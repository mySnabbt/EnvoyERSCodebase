-- Drop the existing function first to recreate it
DROP FUNCTION IF EXISTS public.check_time_slots_availability;

-- Create an improved version of the batch availability checking function
-- that counts schedules for EACH DAY of the week separately
CREATE OR REPLACE FUNCTION public.check_time_slots_availability(p_date date, p_time_slot_ids uuid[])
RETURNS TABLE(time_slot_id uuid, date date, approved_count bigint, max_employees integer, is_available boolean) AS $$
DECLARE
  week_start_date date;
  week_end_date date;
  first_day_of_week integer;
  day_of_week integer;
BEGIN
  -- Get the system setting for first day of week
  SELECT COALESCE(first_day_of_week, 0) INTO first_day_of_week FROM system_settings LIMIT 1;
  
  -- Extract the day of week (0 = Sunday, 1 = Monday, etc.)
  day_of_week := EXTRACT(DOW FROM p_date)::integer;
  
  -- Calculate the week's start date based on the system's first_day_of_week setting
  IF day_of_week >= first_day_of_week THEN
    week_start_date := p_date - (day_of_week - first_day_of_week)::integer;
  ELSE
    week_start_date := p_date - (day_of_week + 7 - first_day_of_week)::integer;
  END IF;
  
  -- Week end date is 6 days after start date (for a 7-day week)
  week_end_date := week_start_date + 6;
  
  RETURN QUERY
  WITH dates AS (
    -- Generate a series of dates for the entire week
    SELECT generate_series(week_start_date, week_end_date, '1 day'::interval)::date AS date
  ),
  approved_counts AS (
    -- Count approved schedules for each time slot and each date in the week
    SELECT 
      time_slot_id,
      date,
      COUNT(*) AS count
    FROM 
      schedules
    WHERE 
      date BETWEEN week_start_date AND week_end_date -- Check the entire week
      AND status = 'approved'
      AND time_slot_id = ANY(p_time_slot_ids)
    GROUP BY 
      time_slot_id, date
  )
  
  -- Get one row for each day and each time slot
  SELECT 
    ts.id AS time_slot_id,
    d.date,
    COALESCE(ac.count, 0)::bigint AS approved_count,
    tsl.max_employees,
    -- A slot is available if no limit is set or if it's under the limit
    (tsl.max_employees IS NULL OR COALESCE(ac.count, 0) < tsl.max_employees) AS is_available
  FROM 
    time_slots ts
  CROSS JOIN
    dates d
  LEFT JOIN 
    time_slot_limits tsl ON ts.id = tsl.time_slot_id
  LEFT JOIN 
    approved_counts ac ON ts.id = ac.time_slot_id AND d.date = ac.date
  WHERE 
    ts.id = ANY(p_time_slot_ids)
  ORDER BY
    d.date, ts.id;
END;
$$ LANGUAGE plpgsql; 