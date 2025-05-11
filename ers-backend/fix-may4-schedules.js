require('dotenv').config();
const supabase = require('./src/config/supabase');

async function fixMay4Schedules() {
  console.log('Adding approved schedules for May 4th, 2025...');
  
  // First check if any May 4th schedules exist
  const { data: existingSchedules, error: checkError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', '2025-05-04');
  
  if (checkError) {
    console.error('Error checking existing schedules:', checkError);
    return;
  }
  
  console.log(`Found ${existingSchedules?.length || 0} existing schedules for May 4th:`, existingSchedules);
  
  // Get an employee ID
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, user_id, name')
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
  
  console.log(`Using employee ID: ${employeeId} (${employees[0].name})`);
  
  // Get time slot IDs
  const { data: timeSlots, error: tsError } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .order('id');
  
  if (tsError) {
    console.error('Error fetching time slots:', tsError);
    return;
  }
  
  console.log('Available time slots:', timeSlots);
  
  // Create an array to store schedule creation promises
  const schedulePromises = [];
  
  // Add a schedule for each time slot
  for (const slot of timeSlots) {
    const scheduleData = {
      employee_id: employeeId,
      date: '2025-05-04', // Specifically use May 4th
      time_slot_id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: 'approved', // Make sure it's approved
      requested_by: userId,
      approved_by: userId,
      approval_date: new Date().toISOString(),
      week_start_date: '2025-05-04'
    };
    
    console.log(`Creating schedule for time slot ${slot.id}`);
    
    const promise = supabase
      .from('schedules')
      .insert([scheduleData])
      .select();
      
    schedulePromises.push(promise);
  }
  
  try {
    const results = await Promise.all(schedulePromises);
    console.log('Schedule creation results:', results);
    
    // Verify the schedules were created
    const { data: verifySchedules, error: verifyError } = await supabase
      .from('schedules')
      .select('*')
      .eq('date', '2025-05-04')
      .eq('status', 'approved');
    
    if (verifyError) {
      console.error('Error verifying schedules:', verifyError);
      return;
    }
    
    console.log(`Found ${verifySchedules?.length || 0} approved schedules for May 4th:`, verifySchedules);
  } catch (error) {
    console.error('Error creating schedules:', error);
  }
}

fixMay4Schedules().catch(console.error); 