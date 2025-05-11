require('dotenv').config();
const supabase = require('./src/config/supabase');

async function addSecondSchedule() {
  console.log('Adding second test approved schedule for 2025-05-04...');
  
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
  
  // For the second slot we want the one with ID cc5b8a86-7854-4a1c-8485-8fc5c4a8b736
  const timeSlotId = 'cc5b8a86-7854-4a1c-8485-8fc5c4a8b736';
  
  // Get the time slot details
  const { data: timeSlot, error: tsError } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', timeSlotId)
    .single();
  
  if (tsError) {
    console.error('Error fetching time slot:', tsError);
    return;
  }
  
  console.log('Using time slot:', timeSlot);
  
  // Create an approved schedule for 2025-05-04
  const scheduleData = {
    employee_id: employeeId,
    date: '2025-05-04',
    time_slot_id: timeSlotId,
    start_time: timeSlot.start_time,
    end_time: timeSlot.end_time,
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
  
  console.log('Successfully created second test schedule:', newSchedule);
  
  // Verify all schedules for this date
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

addSecondSchedule().catch(console.error); 