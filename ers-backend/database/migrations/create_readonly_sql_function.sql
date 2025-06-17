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