require('dotenv').config();
const supabase = require('./src/config/supabase');

async function addTestSchedule() {
  console.log('Adding test approved schedule for 2025-05-04...');
  
  // First get an employee ID to use
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, user_id')
    .limit(1);
  
  if (empError) {
    console.error('Error fetching employee:', empError);
    return;
  }
  
  if (!employees || employees.length === 0) {
    console.error('No employees found in database');
    return;
  }
  
  const employeeId = employees[0].id;
  const userId = employees[0].user_id;
  
  console.log(`Using employee ID: ${employeeId}`);
  
  // Get the time slot IDs we want to test with
  const { data: timeSlots, error: tsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .limit(10);
  
  if (tsError) {
    console.error('Error fetching time slots:', tsError);
    return;
  }
  
  if (!timeSlots || timeSlots.length === 0) {
    console.error('No time slots found in database');
    return;
  }
  
  console.log('Available time slots:', timeSlots);
  
  // Let's pick the first time slot
  const timeSlotId = timeSlots[0].id;
  console.log(`Using time slot ID: ${timeSlotId}`);
  
  // Create an approved schedule for 2025-05-04
  const scheduleData = {
    employee_id: employeeId,
    date: '2025-05-04',
    time_slot_id: timeSlotId,
    start_time: timeSlots[0].start_time,
    end_time: timeSlots[0].end_time,
    status: 'approved',
    requested_by: userId,
    approved_by: userId,
    approval_date: new Date().toISOString(),
    week_start_date: '2025-05-04'
  };
  
  const { data: newSchedule, error: scheduleError } = await supabase
    .from('schedules')
    .insert([scheduleData])
    .select();
  
  if (scheduleError) {
    console.error('Error creating test schedule:', scheduleError);
    return;
  }
  
  console.log('Successfully created test schedule:', newSchedule);
  
  // Verify it was created
  const { data: verifySchedule, error: verifyError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', '2025-05-04')
    .eq('status', 'approved');
  
  if (verifyError) {
    console.error('Error verifying schedule:', verifyError);
    return;
  }
  
  console.log(`Found ${verifySchedule?.length || 0} approved schedules for date 2025-05-04:`, verifySchedule);
}

addTestSchedule().catch(console.error); 