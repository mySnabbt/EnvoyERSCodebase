require('dotenv').config();
const supabase = require('./src/config/supabase');

async function checkMay7Schedules() {
  console.log('Checking schedules for May 7th, 2025...');
  
  // Check for ALL schedules for date 2025-05-07
  const { data: allSchedules, error: allError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', '2025-05-07');
  
  if (allError) {
    console.error('Error fetching all schedules:', allError);
    return;
  }
  
  console.log(`Found ${allSchedules?.length || 0} schedules for date 2025-05-07:`, allSchedules);
  
  // Check for APPROVED schedules for date 2025-05-07
  const { data: approvedSchedules, error: approvedError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', '2025-05-07')
    .eq('status', 'approved');
  
  if (approvedError) {
    console.error('Error fetching approved schedules:', approvedError);
    return;
  }
  
  console.log(`Found ${approvedSchedules?.length || 0} APPROVED schedules for date 2025-05-07:`, approvedSchedules);
  
  // Get time slot IDs
  const { data: timeSlots, error: tsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .order('id');
  
  if (tsError) {
    console.error('Error fetching time slots:', tsError);
    return;
  }
  
  // Create a map of time slot IDs to counts
  const scheduleCountsBySlot = {};
  
  timeSlots.forEach(slot => {
    scheduleCountsBySlot[slot.id] = {
      timeSlot: slot,
      approvedCount: 0,
      totalCount: 0
    };
  });
  
  // Count schedules by time slot
  allSchedules.forEach(schedule => {
    const slotId = schedule.time_slot_id;
    if (scheduleCountsBySlot[slotId]) {
      scheduleCountsBySlot[slotId].totalCount++;
      
      if (schedule.status === 'approved') {
        scheduleCountsBySlot[slotId].approvedCount++;
      }
    }
  });
  
  console.log('Schedule counts by time slot:', scheduleCountsBySlot);
}

checkMay7Schedules().catch(console.error); 