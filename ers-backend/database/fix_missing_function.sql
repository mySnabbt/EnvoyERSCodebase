-- Create the missing function for getting users without employee profiles
CREATE OR REPLACE FUNCTION public.get_users_without_employee_profile()
RETURNS SETOF users AS $$
  SELECT u.* FROM users u
  LEFT JOIN employees e ON u.id = e.user_id
  WHERE e.id IS NULL;
$$ LANGUAGE sql; 

-- Create a function for batch checking time slot availability
CREATE OR REPLACE FUNCTION public.check_time_slots_availability(p_date date, p_time_slot_ids uuid[])
RETURNS TABLE(time_slot_id uuid, approved_count bigint, max_employees integer, is_available boolean) AS $$
  SELECT 
    ts.id AS time_slot_id,
    COALESCE(s.approved_count, 0) AS approved_count,
    tsl.max_employees AS max_employees,
    -- A slot is available if no limit is set or if it's under the limit
    (tsl.max_employees IS NULL OR COALESCE(s.approved_count, 0) < tsl.max_employees) AS is_available
  FROM 
    time_slots ts
  LEFT JOIN 
    time_slot_limits tsl ON ts.id = tsl.time_slot_id
  LEFT JOIN (
    SELECT 
      time_slot_id, 
      COUNT(*) AS approved_count
    FROM 
      schedules
    WHERE 
      date = p_date AND status = 'approved'
      AND time_slot_id = ANY(p_time_slot_ids)
    GROUP BY 
      time_slot_id
  ) s ON ts.id = s.time_slot_id
  WHERE 
    ts.id = ANY(p_time_slot_ids);
$$ LANGUAGE sql; 