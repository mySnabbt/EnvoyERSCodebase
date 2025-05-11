require('dotenv').config();
const supabase = require('./src/config/supabase');

async function checkSchedules() {
  console.log('Checking for approved schedules in the database...');
  
  // First check if the database connection is working
  const { data: settingsData, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1);
  
  if (settingsError) {
    console.error('Database connection error:', settingsError);
    return;
  }
  
  console.log('Database connection is working. Found settings:', settingsData);
  
  // Check for any schedules in the database
  const { data: allSchedules, error: allError } = await supabase
    .from('schedules')
    .select('*')
    .limit(10);
  
  if (allError) {
    console.error('Error fetching schedules:', allError);
    return;
  }
  
  console.log(`Found ${allSchedules?.length || 0} schedules in total. Sample:`, allSchedules);
  
  // Check for approved schedules for date 2025-05-04
  const { data: approvedSchedules, error: approvedError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', '2025-05-04')
    .eq('status', 'approved');
  
  if (approvedError) {
    console.error('Error fetching approved schedules:', approvedError);
    return;
  }
  
  console.log(`Found ${approvedSchedules?.length || 0} approved schedules for date 2025-05-04:`, approvedSchedules);
  
  // Check time slots
  const { data: timeSlots, error: timeSlotsError } = await supabase
    .from('time_slots')
    .select('*')
    .limit(10);
  
  if (timeSlotsError) {
    console.error('Error fetching time slots:', timeSlotsError);
    return;
  }
  
  console.log(`Found ${timeSlots?.length || 0} time slots. Sample:`, timeSlots);
  
  // Check time slot limits
  const { data: timeSlotLimits, error: limitsError } = await supabase
    .from('time_slot_limits')
    .select('*')
    .limit(10);
  
  if (limitsError) {
    console.error('Error fetching time slot limits:', limitsError);
    return;
  }
  
  console.log(`Found ${timeSlotLimits?.length || 0} time slot limits. Sample:`, timeSlotLimits);
}

checkSchedules().catch(console.error); 