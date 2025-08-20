const supabase = require('../config/supabase');

const ShiftCancellationModel = {
  // Create a shift cancellation request
  async createCancellationRequest(requestData) {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .insert([requestData])
      .select(`
        *,
        schedule:schedule_id (
          id,
          date,
          start_time,
          end_time,
          employee:employee_id (
            id,
            name,
            user:user_id (id, name, email)
          ),
          time_slot:time_slot_id (
            id,
            name
          )
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get cancellation request by ID
  async getCancellationRequestById(requestId) {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .select(`
        *,
        schedule:schedule_id (
          id,
          date,
          start_time,
          end_time,
          employee:employee_id (
            id,
            name,
            user:user_id (id, name, email)
          ),
          time_slot:time_slot_id (
            id,
            name
          )
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        ),
        fulfilled_by_user:fulfilled_by (
          id,
          name,
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get active cancellation requests
  async getActiveCancellationRequests() {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .select(`
        *,
        schedule:schedule_id (
          id,
          date,
          start_time,
          end_time,
          employee:employee_id (
            id,
            name,
            user:user_id (id, name, email)
          ),
          time_slot:time_slot_id (
            id,
            name
          )
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        )
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get cancellation requests for a specific user
  async getCancellationRequestsForUser(userId) {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .select(`
        *,
        schedule:schedule_id (
          id,
          date,
          start_time,
          end_time,
          employee:employee_id (
            id,
            name,
            user:user_id (id, name, email)
          ),
          time_slot:time_slot_id (
            id,
            name
          )
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        ),
        fulfilled_by_user:fulfilled_by (
          id,
          name,
          email
        )
      `)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Accept/fulfill a cancellation request
  async fulfillCancellationRequest(requestId, fulfilledBy, newEmployeeId) {
    // Start a transaction
    const { data: request, error: fetchError } = await supabase
      .from('shift_cancellation_requests')
      .select(`
        *,
        schedule:schedule_id (*)
      `)
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('Cancellation request not found or already processed');

    // Check if not expired
    if (new Date(request.expires_at) < new Date()) {
      throw new Error('Cancellation request has expired');
    }

    // Update the schedule with new employee
    const { data: updatedSchedule, error: scheduleError } = await supabase
      .from('schedules')
      .update({ 
        employee_id: newEmployeeId,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.schedule_id)
      .select(`
        *,
        employee:employee_id (
          id,
          name,
          user:user_id (id, name, email)
        ),
        time_slot:time_slot_id (
          id,
          name
        )
      `)
      .single();

    if (scheduleError) throw scheduleError;

    // Update cancellation request as fulfilled
    const { data: fulfilledRequest, error: fulfillError } = await supabase
      .from('shift_cancellation_requests')
      .update({
        status: 'fulfilled',
        fulfilled_by: fulfilledBy,
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select(`
        *,
        schedule:schedule_id (
          id,
          date,
          start_time,
          end_time,
          employee:employee_id (
            id,
            name,
            user:user_id (id, name, email)
          ),
          time_slot:time_slot_id (
            id,
            name
          )
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        ),
        fulfilled_by_user:fulfilled_by (
          id,
          name,
          email
        )
      `)
      .single();

    if (fulfillError) throw fulfillError;

    return {
      cancellationRequest: fulfilledRequest,
      updatedSchedule
    };
  },

  // Cancel a cancellation request (by the original requester)
  async cancelCancellationRequest(requestId, userId) {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('requested_by', userId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Check if schedule has pending cancellation request
  async hasPendingCancellation(scheduleId) {
    const { data, error } = await supabase
      .from('shift_cancellation_requests')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // Clean up expired requests
  async cleanupExpired() {
    const { data, error } = await supabase.rpc('cleanup_expired_items');
    if (error) throw error;
    return data;
  }
};

module.exports = ShiftCancellationModel;
