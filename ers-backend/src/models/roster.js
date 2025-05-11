const supabase = require('../config/supabase');

const RosterModel = {
  // Get weekly roster
  async getWeeklyRoster(weekStartDate) {
    // Calculate week end date (7 days from start)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        notes,
        employees (
          id, 
          name,
          position,
          department_id,
          departments (
            id,
            name
          )
        )
      `)
      .gte('date', weekStartDate)
      .lte('date', weekEndDate.toISOString().split('T')[0])
      .eq('status', 'approved')
      .order('date')
      .order('start_time');
    
    if (error) throw error;
    return data;
  },
  
  // Get department roster
  async getDepartmentRoster(departmentId, weekStartDate) {
    // Calculate week end date (7 days from start)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        notes,
        employees (
          id, 
          name,
          position,
          department_id
        )
      `)
      .gte('date', weekStartDate)
      .lte('date', weekEndDate.toISOString().split('T')[0])
      .eq('status', 'approved')
      .eq('employees.department_id', departmentId)
      .order('date')
      .order('start_time');
    
    if (error) throw error;
    return data;
  },
  
  // Get employee timesheet
  async getEmployeeTimesheet(employeeId, startDate, endDate) {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        notes
      `)
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'approved')
      .order('date')
      .order('start_time');
    
    if (error) throw error;
    return data;
  },
  
  // Calculate total hours worked
  async getTotalHoursWorked(employeeId, startDate, endDate) {
    const timesheet = await this.getEmployeeTimesheet(employeeId, startDate, endDate);
    
    // Calculate total hours
    let totalMinutes = 0;
    
    for (const shift of timesheet) {
      const startTime = new Date(`${shift.date}T${shift.start_time}`);
      const endTime = new Date(`${shift.date}T${shift.end_time}`);
      
      // Handle overnight shifts
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      const durationMinutes = (endTime - startTime) / (1000 * 60);
      totalMinutes += durationMinutes;
    }
    
    // Convert to hours (rounded to 2 decimal places)
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    
    return totalHours;
  },
  
  // Get daily roster
  async getDailyRoster(date) {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        notes,
        employees (
          id, 
          name,
          position,
          department_id,
          departments (
            id,
            name
          )
        )
      `)
      .eq('date', date)
      .eq('status', 'approved')
      .order('start_time');
    
    if (error) throw error;
    return data;
  },
  
  // Get employees working at a specific time
  async getEmployeesWorkingAtTime(date, time) {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        date,
        start_time,
        end_time,
        employees (
          id, 
          name,
          position,
          department_id,
          departments (
            id,
            name
          )
        )
      `)
      .eq('date', date)
      .lte('start_time', time)
      .gte('end_time', time)
      .eq('status', 'approved');
    
    if (error) throw error;
    return data;
  }
};

module.exports = RosterModel; 