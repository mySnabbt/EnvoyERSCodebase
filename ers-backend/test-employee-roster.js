// Test script for the new getEmployeesByDateAndTimeSlot function
const ScheduleModel = require('./src/models/schedule');

// Date to test - use today's date
const today = new Date();
const testDate = today.toISOString().split('T')[0]; // format as YYYY-MM-DD

console.log(`\n=== Testing getEmployeesByDateAndTimeSlot for date: ${testDate} ===\n`);

async function testGetEmployeesByDateAndTimeSlot() {
  try {
    // Call the function with today's date
    console.log('Fetching employee roster data...');
    const result = await ScheduleModel.getEmployeesByDateAndTimeSlot(testDate);
    
    // Display the results
    console.log('\nRESULTS:');
    console.log('---------------------------------------------------------------');
    console.log(`Date: ${result.date}`);
    console.log(`Total employees scheduled: ${result.employee_count || 0}`);
    console.log('---------------------------------------------------------------\n');
    
    if (result.message) {
      console.log(result.message);
    } else if (result.time_slots && result.time_slots.length > 0) {
      // Display each time slot with its employees
      result.time_slots.forEach((slot, index) => {
        console.log(`Time Slot #${index + 1}: ${slot.time_range}`);
        if (slot.time_slot_name) {
          console.log(`  Name: ${slot.time_slot_name}`);
        }
        console.log(`  Employees (${slot.employees.length}):`);
        
        if (slot.employees.length === 0) {
          console.log('    No employees scheduled for this time slot');
        } else {
          slot.employees.forEach((employee, empIndex) => {
            console.log(`    ${empIndex + 1}. ${employee.name} (${employee.position})`);
          });
        }
        console.log(''); // Empty line for readability
      });
    } else {
      console.log('No time slots found for this date.');
    }
    
    console.log('Test completed successfully!\n');
  } catch (error) {
    console.error('TEST FAILED with error:', error);
  }
}

// Run the test
testGetEmployeesByDateAndTimeSlot(); 