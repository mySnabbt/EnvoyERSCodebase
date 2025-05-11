const RosterModel = require('../models/roster');
const EmployeeModel = require('../models/employee');
const supabase = require('../config/supabase');

const RosterController = {
  // Get weekly roster (admin only)
  async getWeeklyRoster(req, res) {
    try {
      const { week_start_date } = req.query;
      
      if (!week_start_date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide week_start_date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(week_start_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // Only admin can view complete roster
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view the full roster'
        });
      }
      
      const roster = await RosterModel.getWeeklyRoster(week_start_date);
      
      return res.status(200).json({
        success: true,
        data: roster
      });
    } catch (error) {
      console.error('Get weekly roster error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get department roster (admin only)
  async getDepartmentRoster(req, res) {
    try {
      const { department_id } = req.params;
      const { week_start_date } = req.query;
      
      if (!week_start_date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide week_start_date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(week_start_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // Only admin can view department roster
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view department rosters'
        });
      }
      
      const roster = await RosterModel.getDepartmentRoster(department_id, week_start_date);
      
      return res.status(200).json({
        success: true,
        data: roster
      });
    } catch (error) {
      console.error('Get department roster error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get employee timesheet (admin can view any, employees can only view their own)
  async getEmployeeTimesheet(req, res) {
    try {
      const { employee_id } = req.params;
      const { start_date, end_date } = req.query;
      
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide start_date and end_date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // For non-admin, check if user is requesting their own timesheet
      if (req.user.role !== 'admin') {
        // Get the employee for the current user
        const userEmployee = await EmployeeModel.getEmployeeByUserId(req.user.id);
        
        if (!userEmployee) {
          return res.status(403).json({
            success: false,
            message: 'You do not have an employee record'
          });
        }
        
        if (userEmployee.id !== employee_id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view your own timesheet'
          });
        }
      }
      
      const timesheet = await RosterModel.getEmployeeTimesheet(employee_id, start_date, end_date);
      const totalHours = await RosterModel.getTotalHoursWorked(employee_id, start_date, end_date);
      
      return res.status(200).json({
        success: true,
        data: {
          timesheet,
          total_hours: totalHours
        }
      });
    } catch (error) {
      console.error('Get employee timesheet error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get daily roster (admin only)
  async getDailyRoster(req, res) {
    try {
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // Only admin can view daily roster
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view the daily roster'
        });
      }
      
      const roster = await RosterModel.getDailyRoster(date);
      
      return res.status(200).json({
        success: true,
        data: roster
      });
    } catch (error) {
      console.error('Get daily roster error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get employees working at a specific time (admin only)
  async getEmployeesWorkingAtTime(req, res) {
    try {
      const { date, time } = req.query;
      
      if (!date || !time) {
        return res.status(400).json({
          success: false,
          message: 'Please provide date and time'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      // Only admin can view working employees
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view employees currently working'
        });
      }
      
      const employees = await RosterModel.getEmployeesWorkingAtTime(date, time);
      
      return res.status(200).json({
        success: true,
        data: employees
      });
    } catch (error) {
      console.error('Get employees working at time error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get roster for a date range (for Timesheet view)
  async getRosterByDateRange(req, res) {
    try {
      const { startDate, endDate, departmentId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Please provide startDate and endDate'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      let query = supabase
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
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'approved')
        .order('date')
        .order('start_time');
      
      // Add department filter if provided
      if (departmentId && departmentId !== 'all') {
        query = query.eq('employees.department_id', departmentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Roster date range query error:', error);
        throw error;
      }
      
      return res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      console.error('Get roster by date range error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = RosterController; 