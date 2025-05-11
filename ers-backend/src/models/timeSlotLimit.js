const supabase = require('../config/supabase');

const TimeSlotLimit = {
  async getLimitByTimeSlot(timeSlotId) {
    const { data, error } = await supabase
      .from('time_slot_limits')
      .select('*')
      .eq('time_slot_id', timeSlotId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Not found is acceptable
    return data;
  },

  async setLimit(timeSlotId, maxEmployees) {
    // Check if limit exists
    const { data: existingLimit } = await supabase
      .from('time_slot_limits')
      .select('id')
      .eq('time_slot_id', timeSlotId)
      .single();
    
    if (existingLimit) {
      // Update existing
      const { data, error } = await supabase
        .from('time_slot_limits')
        .update({ max_employees: maxEmployees })
        .eq('time_slot_id', timeSlotId)
        .select();
      
      if (error) throw error;
      return data[0];
    } else {
      // Create new
      const { data, error } = await supabase
        .from('time_slot_limits')
        .insert([{ time_slot_id: timeSlotId, max_employees: maxEmployees }])
        .select();
      
      if (error) throw error;
      return data[0];
    }
  },

  async getCurrentBookings(timeSlotId) {
    const { data, error } = await supabase
      .from('schedules')
      .select('count')
      .eq('time_slot_id', timeSlotId)
      .eq('status', 'approved');
    
    if (error) throw error;
    return parseInt(data[0]?.count || '0');
  },

  async isSlotAvailable(timeSlotId) {
    const limit = await this.getLimitByTimeSlot(timeSlotId);
    if (!limit) return true; // If no limit set, slot is available
    
    const currentBookings = await this.getCurrentBookings(timeSlotId);
    return currentBookings < limit.max_employees;
  }
};

module.exports = TimeSlotLimit; 