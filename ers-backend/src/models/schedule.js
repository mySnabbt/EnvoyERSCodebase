const supabase = require('../config/supabase');

const schedulesTable = 'schedules';

const ScheduleModel = {
  // Get all schedules with optional filtering
  async getSchedules(filters = {}) {
    let query = supabase
      .from(schedulesTable)
      .select(`
        *,
        employee:employees(id, name, email, phone, position, 
          user:user_id(id, name, first_name, last_name, email)),
        time_slot:time_slots(id, name, start_time, end_time, day_of_week)
      `);
    
    // Apply filters if provided
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    
    if (filters.date) {
      query = query.eq('date', filters.date);
    }

    if (filters.start_date && filters.end_date) {
      query = query.gte('date', filters.start_date).lte('date', filters.end_date);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.requested_by) {
      query = query.eq('requested_by', filters.requested_by);
    }
    
    // Sorting
    query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Get schedule by ID
  async getScheduleById(id) {
    const { data, error } = await supabase
      .from(schedulesTable)
      .select(`
        *,
        employee:employees(id, name, email, phone, position, 
          user:user_id(id, name, first_name, last_name, email))
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get employee schedules
  async getEmployeeSchedules(employeeId, filters = {}) {
    let query = supabase
      .from(schedulesTable)
      .select('*')
      .eq('employee_id', employeeId);
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.start_date && filters.end_date) {
      query = query.gte('date', filters.start_date).lte('date', filters.end_date);
    }
    
    query = query.order('date', { ascending: true }).order('start_time', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Request a schedule (create with pending status)
  async requestSchedule(scheduleData) {
    console.log(`[DEBUG] Request schedule called with data:`, JSON.stringify(scheduleData, null, 2));
    
    // Ensure dates and times are valid
    if (!this.isValidScheduleTime(scheduleData.start_time, scheduleData.end_time)) {
      console.log('[DEBUG] Invalid schedule times - end time is not after start time');
      throw new Error('Invalid schedule times. End time must be after start time.');
    }

    // Check for exact scheduling conflicts only - allowing multiple non-conflicting time slots per day
    const hasConflict = await this.checkScheduleConflict(
      scheduleData.employee_id,
      scheduleData.date,
      scheduleData.start_time,
      scheduleData.end_time,
      null // No ID means we're creating a new schedule
    );

    if (hasConflict) {
      console.log('[DEBUG] Schedule conflict detected');
      throw new Error('Schedule conflicts with an existing time slot. You already have an overlapping booking during this time period.');
    }

    console.log('[DEBUG] No conflicts found, creating schedule');
    // Use the createSchedule method which is designed to handle batch operations
    return this.createSchedule(scheduleData);
  },

  // Approve a schedule request
  async approveSchedule(scheduleId, approverId) {
    console.log(`Starting approval process for schedule ID: ${scheduleId} by approver: ${approverId}`);
    
    // First retrieve the schedule to validate it exists
    const { data: schedule, error: getError } = await supabase
      .from(schedulesTable)
      .select('*')
      .eq('id', scheduleId)
      .single();
      
    if (getError || !schedule) {
      console.error('Error retrieving schedule for approval:', getError);
      throw new Error('Schedule not found');
    }
    
    console.log('Found schedule to approve:', schedule);
    
    // Ensure the schedule is in pending status
    if (schedule.status !== 'pending') {
      console.error(`Cannot approve schedule with status: ${schedule.status}`);
      throw new Error(`Schedule not found or already processed (status: ${schedule.status})`);
    }
    
    // Perform the update
    console.log('Updating schedule status to approved');
    const updateData = {
      status: 'approved',
      approved_by: approverId,
      approval_date: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(schedulesTable)
      .update(updateData)
      .eq('id', scheduleId)
      .select();
    
    if (error) {
      console.error('Error during schedule approval:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('Schedule not found or update failed');
      throw new Error('Schedule not found or already processed');
    }
    
    console.log('Schedule successfully approved:', data[0]);
    return data[0];
  },

  // Reject a schedule request
  async rejectSchedule(scheduleId, approverId, rejectionReason) {
    const { data, error } = await supabase
      .from(schedulesTable)
      .update({
        status: 'rejected',
        approved_by: approverId,
        approval_date: new Date().toISOString(),
        rejection_reason: rejectionReason || 'Request rejected'
      })
      .eq('id', scheduleId)
      .eq('status', 'pending') // Only pending schedules can be rejected
      .select();
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      throw new Error('Schedule not found or already processed');
    }
    
    return data[0];
  },

  // Update an existing schedule
  async updateSchedule(id, scheduleData) {
    // If changing times, ensure they're valid
    if (scheduleData.start_time && scheduleData.end_time) {
      if (!this.isValidScheduleTime(scheduleData.start_time, scheduleData.end_time)) {
        throw new Error('Invalid schedule times. End time must be after start time.');
      }
    }

    // Get the current schedule to check for conflicts
    const currentSchedule = await this.getScheduleById(id);
    if (!currentSchedule) {
      throw new Error('Schedule not found');
    }

    // Check for conflicts if date or time is being changed
    if ((scheduleData.date || scheduleData.start_time || scheduleData.end_time) &&
        (scheduleData.date !== currentSchedule.date || 
         scheduleData.start_time !== currentSchedule.start_time || 
         scheduleData.end_time !== currentSchedule.end_time)) {
      
      const hasConflict = await this.checkScheduleConflict(
        scheduleData.employee_id || currentSchedule.employee_id,
        scheduleData.date || currentSchedule.date,
        scheduleData.start_time || currentSchedule.start_time,
        scheduleData.end_time || currentSchedule.end_time,
        id // Exclude this schedule from conflict check
      );

      if (hasConflict) {
        throw new Error('Schedule update conflicts with existing employee schedule.');
      }
    }

    // If updated by non-admin, reset to pending status
    if (scheduleData.is_employee_update && currentSchedule.status === 'approved') {
      scheduleData.status = 'pending';
      // Remove fields that shouldn't be directly updated by employees
      delete scheduleData.approved_by;
      delete scheduleData.approval_date;
    }
    
    delete scheduleData.is_employee_update; // Remove the flag
    
    const { data, error } = await supabase
      .from(schedulesTable)
      .update(scheduleData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Delete a schedule
  async deleteSchedule(id) {
    const { error } = await supabase
      .from(schedulesTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true, message: 'Schedule deleted successfully' };
  },

  // Get pending schedule requests
  async getPendingRequests() {
    const { data, error } = await supabase
      .from('pending_schedule_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Utility: Check if there's a scheduling conflict
  async checkScheduleConflict(employeeId, date, startTime, endTime, excludeId = null) {
    // Convert times to proper format if needed
    const formattedStartTime = typeof startTime === 'string' ? startTime : startTime.toString();
    const formattedEndTime = typeof endTime === 'string' ? endTime : endTime.toString();
    
    console.log(`[DEBUG] Checking schedule conflict:
      - Employee ID: ${employeeId}
      - Date: ${date}
      - Start Time: ${formattedStartTime}
      - End Time: ${formattedEndTime}
      - Exclude ID: ${excludeId || 'none'}
    `);
    
    // Get all schedules for this employee on this date that aren't rejected
    let query = supabase
      .from(schedulesTable)
      .select('id, start_time, end_time, status, time_slot_id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .not('status', 'eq', 'rejected');
    
    // Exclude current schedule from check if updating
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[DEBUG] Error checking for schedule conflicts:', error);
      throw error;
    }
    
    console.log(`[DEBUG] Found ${data?.length || 0} existing schedules for this employee on ${date}:`, data);
    
    // MODIFIED BEHAVIOR: Allow multiple bookings on the same day as long as they don't overlap in time
    // This is more lenient than the previous implementation which disallowed any booking on the same day
    
    // Check each schedule for true overlaps
    for (const schedule of data || []) {
      // True overlap: new schedule starts before existing ends AND 
      // new schedule ends after existing starts
      // BUT allow exact touching (one ends exactly when another starts)
      const hasOverlap = formattedStartTime < schedule.end_time && 
                         formattedEndTime > schedule.start_time && 
                         formattedStartTime !== schedule.end_time && 
                         formattedEndTime !== schedule.start_time;
      
      console.log(`[DEBUG] Checking overlap with schedule ${schedule.id}:
        - Existing schedule: ${schedule.start_time} - ${schedule.end_time} (${schedule.status})
        - New schedule: ${formattedStartTime} - ${formattedEndTime}
        - Has overlap: ${hasOverlap}
        - Condition breakdown:
          * formattedStartTime < schedule.end_time: ${formattedStartTime < schedule.end_time}
          * formattedEndTime > schedule.start_time: ${formattedEndTime > schedule.start_time}
          * formattedStartTime !== schedule.end_time: ${formattedStartTime !== schedule.end_time}
          * formattedEndTime !== schedule.start_time: ${formattedEndTime !== schedule.start_time}
      `);
      
      if (hasOverlap) {
        console.log(`[DEBUG] Conflict found with schedule ${schedule.id}`);
        return true; // Conflict found
      }
    }
    
    console.log('[DEBUG] No conflicts found');
    return false; // No conflict
  },

  // Utility: Validate start time is before end time
  isValidScheduleTime(startTime, endTime) {
    return startTime < endTime;
  },

  // Create a schedule (for batch operations like weekly scheduling)
  async createSchedule(scheduleData) {
    // Ensure status is set
    if (!scheduleData.status) {
      scheduleData.status = 'pending';
    }
    
    // We intentionally skip conflict checking here to allow multiple slots per day
    
    const { data, error } = await supabase
      .from(schedulesTable)
      .insert([scheduleData])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Get employees scheduled on a specific date, organized by time slot
  async getEmployeesByDateAndTimeSlot(date) {
    try {
      // Step 1: Get all schedules for the specified date with employee and time slot info
      const { data: schedules, error } = await supabase
        .from(schedulesTable)
        .select(`
          *,
          employee:employees(id, name, email, position, department_id),
          time_slot:time_slots(id, name, start_time, end_time, day_of_week)
        `)
        .eq('date', date)
        .eq('status', 'approved') // Only show approved schedules
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      if (!schedules || schedules.length === 0) {
        return { message: 'No schedules found for this date' };
      }
      
      // Step 2: Group by time slots
      const timeSlotMap = {};
      
      // First gather all schedules by time slot
      schedules.forEach(schedule => {
        // Use either the time slot or the direct time values
        const timeKey = schedule.time_slot_id 
          ? `${schedule.time_slot?.start_time || schedule.start_time} - ${schedule.time_slot?.end_time || schedule.end_time}`
          : `${schedule.start_time} - ${schedule.end_time}`;
        
        // Initialize the array for this time slot if it doesn't exist
        if (!timeSlotMap[timeKey]) {
          timeSlotMap[timeKey] = {
            start_time: schedule.time_slot?.start_time || schedule.start_time,
            end_time: schedule.time_slot?.end_time || schedule.end_time,
            time_slot_name: schedule.time_slot?.name || '',
            employees: []
          };
        }
        
        // Add the employee to this time slot
        if (schedule.employee) {
          timeSlotMap[timeKey].employees.push({
            id: schedule.employee.id,
            name: schedule.employee.name,
            email: schedule.employee.email,
            position: schedule.employee.position,
            department_id: schedule.employee.department_id
          });
        }
      });
      
      // Convert the map to an array and sort by start time
      const result = Object.entries(timeSlotMap).map(([timeKey, data]) => ({
        time_range: timeKey,
        ...data
      }));
      
      // Sort by start time
      result.sort((a, b) => {
        if (a.start_time < b.start_time) return -1;
        if (a.start_time > b.start_time) return 1;
        return 0;
      });
      
      return {
        date,
        employee_count: schedules.length,
        time_slots: result
      };
    } catch (err) {
      console.error('Error getting employees by date and time slot:', err);
      throw err;
    }
  }
};

module.exports = ScheduleModel; 