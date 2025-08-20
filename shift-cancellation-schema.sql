-- Shift Cancellation and Reassignment System
-- Run these SQL commands on your Supabase database

-- Table for shift cancellation requests
CREATE TABLE IF NOT EXISTS shift_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  fulfilled_by UUID REFERENCES users(id),
  fulfilled_at TIMESTAMPTZ
);

-- Table for notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('shift_cancellation', 'system', 'approval')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Store additional data like schedule_id, cancellation_request_id, etc.
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- For auto-cleanup
);

-- Create trigger function for updating updated_at (CREATE OR REPLACE handles existing function)
CREATE OR REPLACE FUNCTION update_shift_cancellation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shift_cancellation_requests (drop if exists first)
DROP TRIGGER IF EXISTS trigger_shift_cancellation_updated_at ON shift_cancellation_requests;
CREATE TRIGGER trigger_shift_cancellation_updated_at
  BEFORE UPDATE ON shift_cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_cancellation_updated_at();

-- Function to clean up expired notifications and cancellation requests
CREATE OR REPLACE FUNCTION cleanup_expired_items()
RETURNS void AS $$
BEGIN
  -- Mark expired cancellation requests
  UPDATE shift_cancellation_requests 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
  
  -- Delete expired notifications
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Delete old read notifications (older than 30 days)
  DELETE FROM notifications 
  WHERE read = true AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function for instant cleanup of notifications by cancellation request ID
CREATE OR REPLACE FUNCTION cleanup_notifications_by_cancellation(cancellation_req_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete all notifications related to the specific cancellation request
  DELETE FROM notifications 
  WHERE type = 'shift_cancellation' 
    AND data->>'cancellation_request_id' = cancellation_req_id::text;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_cancellation_schedule_id ON shift_cancellation_requests(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shift_cancellation_requested_by ON shift_cancellation_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_shift_cancellation_status ON shift_cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_cancellation_expires_at ON shift_cancellation_requests(expires_at);

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Grant necessary permissions (adjust role names as needed)
-- GRANT ALL ON shift_cancellation_requests TO authenticated;
-- GRANT ALL ON notifications TO authenticated;

-- Insert initial system settings notification (optional)
-- INSERT INTO notifications (user_id, type, title, message, data)
-- SELECT id, 'system', 'Shift Cancellation System', 'The new shift cancellation and reassignment system is now active!', '{}'
-- FROM users WHERE role = 'admin';
