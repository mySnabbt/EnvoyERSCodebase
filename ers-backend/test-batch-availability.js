require('dotenv').config();
const supabase = require('./src/config/supabase');

async function testBatchAvailability() {
  console.log('Testing batch availability for May 4th, 2025...');
  
  // Get time slot IDs
  const { data: timeSlots, error: tsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .order('id');
  
  if (tsError) {
    console.error('Error fetching time slots:', tsError);
    return;
  }
  
  const timeSlotIds = timeSlots.map(slot => slot.id);
  console.log('Time slot IDs to check:', timeSlotIds);
  
  // Directly query the database for approved schedules on May 4th
  const { data: approvedSchedules, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, time_slot_id, employee_id, status, date')
    .eq('date', '2025-05-04')
    .eq('status', 'approved');
  
  if (scheduleError) {
    console.error('Error checking approved schedules:', scheduleError);
    return;
  }
  
  console.log(`Found ${approvedSchedules?.length || 0} approved schedules for date 2025-05-04:`, approvedSchedules);
  
  // Count schedules for each time slot
  const scheduleCountMap = {};
  timeSlotIds.forEach(id => {
    scheduleCountMap[id] = 0; // Initialize all counts to 0
  });
  
  // Count the actual schedules
  if (approvedSchedules && approvedSchedules.length > 0) {
    approvedSchedules.forEach(schedule => {
      const slot = schedule.time_slot_id;
      if (scheduleCountMap[slot] !== undefined) {
        scheduleCountMap[slot]++;
      }
    });
  }
  
  console.log('Schedule counts by time slot:', scheduleCountMap);
  
  // Get the time slot limits
  const { data: timeSlotLimits, error: limitsError } = await supabase
    .from('time_slot_limits')
    .select('time_slot_id, max_employees')
    .in('time_slot_id', timeSlotIds);
  
  if (limitsError) {
    console.error('Error fetching time slot limits:', limitsError);
    return;
  }
  
  // Create a map of time slot ID to max employees
  const maxEmployeesMap = {};
  timeSlotLimits.forEach(limit => {
    maxEmployeesMap[limit.time_slot_id] = limit.max_employees || null;
  });
  
  console.log('Time slot max employees:', maxEmployeesMap);
  
  // Compute availability for all time slots
  const availabilityResults = {};
  timeSlotIds.forEach(id => {
    const maxEmployees = maxEmployeesMap[id];
    const count = scheduleCountMap[id] || 0;
    // A slot is available if no limit is set or if it's under the limit
    const isAvailable = maxEmployees === null || count < maxEmployees;
    
    console.log(`Time slot ${id} availability: ${count}/${maxEmployees || 'unlimited'} approved schedules, available: ${isAvailable}`);
    
    availabilityResults[id] = {
      available: isAvailable,
      count,
      maxEmployees
    };
  });
  
  console.log('Final availability results:', availabilityResults);
}

testBatchAvailability().catch(console.error); 