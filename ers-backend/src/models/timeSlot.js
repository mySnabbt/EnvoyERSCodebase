const supabase = require('../config/supabase');

const timeSlotsTable = 'time_slots';
const timeSlotsLimitsTable = 'time_slot_limits';

const TimeSlotModel = {
  // Get all time slots with optional filtering
  async getTimeSlots(filters = {}) {
    let query = supabase
      .from(timeSlotsTable)
      .select(`
        *,
        limits:${timeSlotsLimitsTable}(max_employees)
      `);
    
    // Apply filters if provided
    if (filters.day_of_week !== undefined) {
      query = query.eq('day_of_week', filters.day_of_week);
    }
    
    // Sorting
    query = query.order('day_of_week').order('start_time');
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Process the data to include max_employees directly in each time slot
    const processedData = data.map(slot => {
      const result = {...slot};
      
      // If there's a limit record, add max_employees directly to the time slot
      if (result.limits && result.limits.length > 0) {
        result.max_employees = result.limits[0].max_employees;
      }
      
      // Clean up the response
      delete result.limits;
      
      return result;
    });
    
    return processedData;
  },
  
  // Get a specific time slot by ID
  async getTimeSlotById(id) {
    const { data, error } = await supabase
      .from(timeSlotsTable)
      .select(`
        *,
        limits:${timeSlotsLimitsTable}(max_employees)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Format the response to include max_employees directly in the time slot object
    if (data) {
      // If there's a limit record, add max_employees directly to the time slot
      if (data.limits && data.limits.length > 0) {
        data.max_employees = data.limits[0].max_employees;
      }
      
      // Clean up the response
      delete data.limits;
    }
    
    return data;
  },

  // Create a new time slot
  async createTimeSlot(timeSlotData) {
    // Validate time range
    if (timeSlotData.start_time >= timeSlotData.end_time) {
      throw new Error('Start time must be before end time');
    }
    
    // Check for overlapping time slots on the same day
    const overlapping = await this.checkOverlappingTimeSlots(
      timeSlotData.day_of_week,
      timeSlotData.start_time,
      timeSlotData.end_time
    );
    
    if (overlapping) {
      throw new Error('Time slot overlaps with an existing time slot for this day');
    }
    
    const { data, error } = await supabase
      .from(timeSlotsTable)
      .insert([timeSlotData])
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  // Update a time slot
  async updateTimeSlot(id, timeSlotData) {
    // Validate time range if both times are provided
    if (timeSlotData.start_time && timeSlotData.end_time) {
      if (timeSlotData.start_time >= timeSlotData.end_time) {
        throw new Error('Start time must be before end time');
      }
    }
    
    // Get current time slot data
    const currentTimeSlot = await this.getTimeSlotById(id);
    if (!currentTimeSlot) {
      throw new Error('Time slot not found');
    }
    
    // Check for overlaps if changing time or day
    if ((timeSlotData.day_of_week !== undefined && timeSlotData.day_of_week !== currentTimeSlot.day_of_week) ||
        (timeSlotData.start_time !== undefined && timeSlotData.start_time !== currentTimeSlot.start_time) ||
        (timeSlotData.end_time !== undefined && timeSlotData.end_time !== currentTimeSlot.end_time)) {
      
      const overlapping = await this.checkOverlappingTimeSlots(
        timeSlotData.day_of_week || currentTimeSlot.day_of_week,
        timeSlotData.start_time || currentTimeSlot.start_time,
        timeSlotData.end_time || currentTimeSlot.end_time,
        id // Exclude this time slot from the check
      );
      
      if (overlapping) {
        throw new Error('Time slot would overlap with an existing time slot for this day');
      }
    }
    
    const { data, error } = await supabase
      .from(timeSlotsTable)
      .update(timeSlotData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  // Delete a time slot
  async deleteTimeSlot(id) {
    // Check if the time slot is being used by any schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('schedules')
      .select('id')
      .eq('time_slot_id', id)
      .limit(1);
    
    if (schedulesError) throw schedulesError;
    
    if (schedules && schedules.length > 0) {
      throw new Error('Cannot delete time slot that is being used by schedules');
    }
    
    const { error } = await supabase
      .from(timeSlotsTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true, message: 'Time slot deleted successfully' };
  },
  
  // Check for overlapping time slots
  async checkOverlappingTimeSlots(dayOfWeek, startTime, endTime, excludeId = null) {
    // First, get all potential overlapping time slots
    let query = supabase
      .from(timeSlotsTable)
      .select('id, start_time, end_time')
      .eq('day_of_week', dayOfWeek);
    
    // Exclude the current time slot if updating
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Check for actual overlaps - a true overlap occurs when:
    // - New slot starts BEFORE existing slot ends AND
    // - New slot ends AFTER existing slot starts
    // - But we ALLOW slots where one ends exactly when another begins
    for (const slot of data) {
      // If new slot starts before existing slot ends
      // AND new slot ends after existing slot starts
      // AND they don't just touch at the endpoints
      if (startTime < slot.end_time && 
          endTime > slot.start_time && 
          !(startTime === slot.end_time || endTime === slot.start_time)) {
        return true; // Overlap found
      }
    }
    
    return false; // No overlap
  },
  
  // Time slot limits functionality
  async getTimeSlotLimit(timeSlotId) {
    const { data, error } = await supabase
      .from(timeSlotsLimitsTable)
      .select('*')
      .eq('time_slot_id', timeSlotId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Not found is acceptable
    return data;
  },
  
  async setTimeSlotLimit(timeSlotId, maxEmployees) {
    if (maxEmployees <= 0) {
      throw new Error('Maximum employees must be greater than zero');
    }
    
    // Check if time slot exists
    const timeSlot = await this.getTimeSlotById(timeSlotId);
    if (!timeSlot) {
      throw new Error('Time slot not found');
    }
    
    // Check if limit already exists
    const existingLimit = await this.getTimeSlotLimit(timeSlotId);
    
    let limitData = null;
    
    // Update or create the limit record
    if (existingLimit) {
      // Update existing limit
      const { data, error } = await supabase
        .from(timeSlotsLimitsTable)
        .update({ max_employees: maxEmployees })
        .eq('id', existingLimit.id)
        .select();
      
      if (error) throw error;
      limitData = data[0];
    } else {
      // Create new limit
      const { data, error } = await supabase
        .from(timeSlotsLimitsTable)
        .insert([{
          time_slot_id: timeSlotId,
          max_employees: maxEmployees
        }])
        .select();
      
      if (error) throw error;
      limitData = data[0];
    }
    
    return limitData;
  },
  
  async getCurrentBookingCount(timeSlotId, weekStartDate) {
    // Calculate week end date (7 days from start)
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const { data, error } = await supabase
      .from('schedules')
      .select('id')
      .eq('time_slot_id', timeSlotId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .eq('status', 'approved');
    
    if (error) throw error;
    return data ? data.length : 0;
  },
  
  // Check if a time slot is available for booking on a specific date
  async isTimeSlotAvailable(timeSlotId, date) {
    try {
      // Get the time slot to check its capacity
      const timeSlot = await this.getTimeSlotById(timeSlotId);
      if (!timeSlot) {
        throw new Error('Time slot not found');
      }
      
      // Get the max_employees limit - first check in the timeSlot object
      let maxEmployees = timeSlot.max_employees;
      
      // If not there, get it from the time_slot_limits table
      if (maxEmployees === undefined) {
        const limitData = await this.getTimeSlotLimit(timeSlotId);
        maxEmployees = limitData ? limitData.max_employees : null;
      }
      
      // If no max_employees set, slot is always available
      if (!maxEmployees) {
        // Only log this occasionally to reduce noise
        if (Math.random() < 0.05) {  // Only log ~5% of the time
          console.log(`Time slot ${timeSlotId} has no booking limit (unlimited capacity)`);
        }
        return true;
      }
      
      // Count existing bookings for this slot on this date - ONLY APPROVED SCHEDULES
      const { count, error } = await supabase
        .from('schedules')
        .select('id', { count: 'exact', head: true })
        .eq('time_slot_id', timeSlotId)
        .eq('date', date)
        .eq('status', 'approved'); // Only count approved schedules
      
      if (error) throw error;
      
      const isAvailable = count < maxEmployees;
      
      // Only log when the availability changes or very occasionally
      // Reduce noise by only logging ~5% of checks or when at full capacity
      if (count >= maxEmployees || Math.random() < 0.05) {
        console.log(`Time slot ${timeSlotId} availability check: ${count}/${maxEmployees !== null ? maxEmployees : 'unlimited'} approved schedules, available: ${isAvailable}`);
      }
      
      // Return true if below capacity, false if at or over capacity
      return isAvailable;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      // Default to available if there's an error to prevent blocking
      return true;
    }
  },
  
  // Get count of approved schedules for a time slot on a specific date
  async getApprovedScheduleCount(timeSlotId, date) {
    try {
      const { count, error } = await supabase
        .from('schedules')
        .select('id', { count: 'exact', head: true })
        .eq('time_slot_id', timeSlotId)
        .eq('date', date)
        .eq('status', 'approved');
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error(`Error getting approved schedule count for time slot ${timeSlotId} on date ${date}:`, error);
      return 0; // Default to 0 if there's an error
    }
  },
  
  // Get availability for multiple time slots on a specific date in a single batch query
  async getBatchAvailability(date, timeSlotIds = []) {
    try {
      console.log(`Batch checking availability for ${timeSlotIds.length} time slots on date ${date}`);
      
      if (!timeSlotIds.length) {
        console.log('No time slot IDs provided for batch availability check');
        return {};
      }

      // Skip the RPC function since we're having issues with it
      // Go directly to our manual batch availability check
      return await this.manualBatchAvailabilityCheck(date, timeSlotIds);
    } catch (error) {
      console.error('Error in batch availability check:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Default all slots to available if there's an error, but don't hardcode capacity
      const availabilityResults = {};
      timeSlotIds.forEach(id => {
        availabilityResults[id] = {
          available: true,
          count: 0,
          maxEmployees: null, // Use null instead of hardcoded value (3)
          error: true
        };
      });
      
      return availabilityResults;
    }
  },
  
  // Manual batch availability check as a fallback
  async manualBatchAvailabilityCheck(date, timeSlotIds = []) {
    console.log('============= BATCH AVAILABILITY CHECK =============');
    console.log('Received date from frontend:', date);
    
    try {
      // Check if timeSlotIds is properly formatted
      if (!Array.isArray(timeSlotIds) || timeSlotIds.length === 0) {
        console.error('Invalid timeSlotIds provided:', timeSlotIds);
        return {};
      }
      
      console.log('Checking for time slots:', timeSlotIds);
      
      // Get system settings for first day of week
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('first_day_of_week')
        .single();
      
      // Get the first day of week from settings, or default to 1 (Monday)
      const firstDayOfWeek = settings?.first_day_of_week ?? 1;
      console.log('System setting - first day of week:', firstDayOfWeek);
      
      // Get all time slot limits in one query
      const { data: timeSlotLimits, error: limitsError } = await supabase
        .from('time_slot_limits')
        .select('time_slot_id, max_employees')
        .in('time_slot_id', timeSlotIds);
      
      if (limitsError) throw limitsError;
      
      // Create a map of time slot ID to max employees
      const maxEmployeesMap = {};
      timeSlotLimits.forEach(limit => {
        maxEmployeesMap[limit.time_slot_id] = limit.max_employees || null;
      });
      
      // Set default max_employees for any time slots without limits
      timeSlotIds.forEach(id => {
        if (!maxEmployeesMap[id]) {
          maxEmployeesMap[id] = null; // Use null for unlimited capacity
        }
      });
      
      console.log('Time slot capacity limits:', maxEmployeesMap);
      
      // Parse the provided date string safely
      const dateParts = date.split('-');
      if (dateParts.length !== 3) {
        throw new Error(`Invalid date format: ${date}`);
      }
      
      const inputYear = parseInt(dateParts[0]);
      const inputMonth = parseInt(dateParts[1]) - 1; // 0-based month
      const inputDay = parseInt(dateParts[2]);
      
      console.log(`Parsed date: Year=${inputYear}, Month=${inputMonth + 1}, Day=${inputDay}`);
      
      // Create input date object using UTC to avoid timezone issues
      const inputDate = new Date(Date.UTC(inputYear, inputMonth, inputDay));
      console.log('Input date as Date object:', inputDate.toISOString());
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = inputDate.getUTCDay();
      console.log('Day of week for input date:', dayOfWeek);
      
      // Calculate days to subtract to get to first day of week
      let daysToSubtract;
      if (dayOfWeek >= firstDayOfWeek) {
        daysToSubtract = dayOfWeek - firstDayOfWeek;
      } else {
        daysToSubtract = dayOfWeek + 7 - firstDayOfWeek;
      }
      console.log('Days to subtract to reach first day of week:', daysToSubtract);
      
      // Calculate start of week based on system settings
      const weekStartDate = new Date(inputDate);
      weekStartDate.setUTCDate(inputDate.getUTCDate() - daysToSubtract);
      console.log('Calculated week start date:', weekStartDate.toISOString());
      
      // Calculate end of week (6 days after start)
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);
      console.log('Calculated week end date:', weekEndDate.toISOString());
      
      // Format dates as YYYY-MM-DD strings for database query
      const formattedWeekStartDate = weekStartDate.toISOString().split('T')[0];
      const formattedWeekEndDate = weekEndDate.toISOString().split('T')[0];
      
      console.log(`Week date range for database query: ${formattedWeekStartDate} to ${formattedWeekEndDate}`);
      
      // Get approved schedules only for the specific week
      const { data: approvedSchedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('id, time_slot_id, employee_id, status, date')
        .eq('status', 'approved')
        .in('time_slot_id', timeSlotIds)
        .gte('date', formattedWeekStartDate)
        .lte('date', formattedWeekEndDate);
      
      if (schedulesError) {
        console.error('Error fetching approved schedules:', schedulesError);
        throw schedulesError;
      }
      
      // Debug what we got back
      console.log(`Found ${approvedSchedules?.length || 0} approved schedules for week ${formattedWeekStartDate} to ${formattedWeekEndDate}`);
      approvedSchedules?.forEach(schedule => {
        console.log(`Schedule ${schedule.id}: time_slot_id=${schedule.time_slot_id}, date=${schedule.date}`);
      });
      
      // Count schedules for each time slot in this week
      const countMap = {};
      timeSlotIds.forEach(id => {
        countMap[id] = approvedSchedules?.filter(s => s.time_slot_id === id)?.length || 0;
      });
      
      console.log('Weekly approved schedule counts by time slot:', countMap);
      
      // Compute availability results
      const availabilityResults = {};
      timeSlotIds.forEach(id => {
        const maxEmployees = maxEmployeesMap[id];
        const count = countMap[id] || 0;
        const isAvailable = maxEmployees === null || count < maxEmployees;
        
        console.log(`Time slot ${id} availability for week ${formattedWeekStartDate} to ${formattedWeekEndDate}: ${count}/${maxEmployees || 'unlimited'} approved schedules, available: ${isAvailable}`);
        
        availabilityResults[id] = {
          available: isAvailable,
          count,
          maxEmployees
        };
      });
      
      console.log('============== END AVAILABILITY CHECK ==============');
      return availabilityResults;
    } catch (error) {
      console.error('Error in batch availability check:', error);
      
      // Default all slots to available if there's an error
      const availabilityResults = {};
      timeSlotIds.forEach(id => {
        availabilityResults[id] = {
          available: true,
          count: 0,
          maxEmployees: null,
          error: true
        };
      });
      
      console.log('============== AVAILABILITY CHECK FAILED ==============');
      return availabilityResults;
    }
  }
};

module.exports = TimeSlotModel; 