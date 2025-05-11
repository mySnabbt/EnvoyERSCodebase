const TimeSlotModel = require('../models/timeSlot');

const TimeSlotController = {
  // Get all time slots with optional filtering
  async getTimeSlots(req, res) {
    try {
      const filters = {
        day_of_week: req.query.day_of_week !== undefined ? parseInt(req.query.day_of_week) : undefined
      };
      
      const timeSlots = await TimeSlotModel.getTimeSlots(filters);
      
      return res.status(200).json({
        success: true,
        data: timeSlots
      });
    } catch (error) {
      console.error('Get time slots error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get a specific time slot by ID
  async getTimeSlotById(req, res) {
    try {
      const { id } = req.params;
      
      const timeSlot = await TimeSlotModel.getTimeSlotById(id);
      
      if (!timeSlot) {
        return res.status(404).json({
          success: false,
          message: 'Time slot not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: timeSlot
      });
    } catch (error) {
      console.error('Get time slot by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Create a new time slot
  async createTimeSlot(req, res) {
    try {
      const {
        day_of_week,
        start_time,
        end_time,
        name,
        description,
        max_employees // Allow setting max_employees when creating
      } = req.body;
      
      // Validate required fields
      if (day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'Please provide day of week, start time, and end time'
        });
      }
      
      // Validate day of week
      // IMPORTANT: In the database, 0 = Saturday, 1 = Sunday, 2 = Monday, etc.
      // This differs from JavaScript's standard where 0 = Sunday, 1 = Monday, etc.
      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 0 (Saturday) and 6 (Friday)'
        });
      }
      
      // Create time slot data
      const timeSlotData = {
        day_of_week: parseInt(day_of_week),
        start_time,
        end_time,
        name,
        description
      };
      
      try {
        // First create the time slot
        const timeSlot = await TimeSlotModel.createTimeSlot(timeSlotData);
        
        // If max_employees was provided, set the limit
        let limitResult = null;
        if (max_employees !== undefined && max_employees !== null) {
          try {
            const maxEmployeesInt = parseInt(max_employees);
            if (!isNaN(maxEmployeesInt) && maxEmployeesInt > 0) {
              limitResult = await TimeSlotModel.setTimeSlotLimit(timeSlot.id, maxEmployeesInt);
              
              // Add max_employees to the response
              timeSlot.max_employees = maxEmployeesInt;
            }
          } catch (limitError) {
            console.error('Error setting time slot limit:', limitError);
            // Don't fail if setting the limit fails, just log the error
          }
        }
        
        return res.status(201).json({
          success: true,
          message: 'Time slot created successfully',
          data: timeSlot,
          limit: limitResult
        });
      } catch (modelError) {
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Create time slot error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Update a time slot
  async updateTimeSlot(req, res) {
    try {
      const { id } = req.params;
      const timeSlotData = req.body;
      
      // If day_of_week is provided, ensure it's an integer
      if (timeSlotData.day_of_week !== undefined) {
        timeSlotData.day_of_week = parseInt(timeSlotData.day_of_week);
        
        // Validate day of week
        if (timeSlotData.day_of_week < 0 || timeSlotData.day_of_week > 6) {
          return res.status(400).json({
            success: false,
            message: 'Day of week must be between 0 (Saturday) and 6 (Friday)'
          });
        }
      }
      
      try {
        const timeSlot = await TimeSlotModel.updateTimeSlot(id, timeSlotData);
        
        return res.status(200).json({
          success: true,
          message: 'Time slot updated successfully',
          data: timeSlot
        });
      } catch (modelError) {
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Update time slot error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Delete a time slot
  async deleteTimeSlot(req, res) {
    try {
      const { id } = req.params;
      
      try {
        const result = await TimeSlotModel.deleteTimeSlot(id);
        
        return res.status(200).json({
          success: true,
          message: result.message
        });
      } catch (modelError) {
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Delete time slot error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Set capacity limit for a time slot
  async setTimeSlotLimit(req, res) {
    try {
      const { id } = req.params;
      const { max_employees } = req.body;
      
      if (!max_employees || isNaN(parseInt(max_employees))) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid maximum number of employees'
        });
      }
      
      try {
        const limit = await TimeSlotModel.setTimeSlotLimit(id, parseInt(max_employees));
        
        return res.status(200).json({
          success: true,
          message: 'Time slot limit set successfully',
          data: limit
        });
      } catch (modelError) {
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Set time slot limit error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get time slot availability
  async checkTimeSlotAvailability(req, res) {
    try {
      const { id } = req.params;
      const { week_start_date } = req.query;
      
      if (!week_start_date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a week start date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(week_start_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for week start date. Please use YYYY-MM-DD'
        });
      }
      
      try {
        const limit = await TimeSlotModel.getTimeSlotLimit(id);
        const currentCount = await TimeSlotModel.getCurrentBookingCount(id, week_start_date);
        const isAvailable = await TimeSlotModel.isTimeSlotAvailable(id, week_start_date);
        
        return res.status(200).json({
          success: true,
          data: {
            time_slot_id: id,
            max_employees: limit ? limit.max_employees : 1,
            current_bookings: currentCount,
            is_available: isAvailable
          }
        });
      } catch (modelError) {
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Check time slot availability error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Check availability for a specific time slot on a given date (only counting approved schedules)
  async checkTimeSlotAvailabilityForDate(req, res) {
    try {
      const { id } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a date'
        });
      }
      
      // Validate date format
      if (isNaN(Date.parse(date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD'
        });
      }
      
      try {
        // Get the time slot to check its capacity
        const timeSlot = await TimeSlotModel.getTimeSlotById(id);
        if (!timeSlot) {
          return res.status(404).json({
            success: false,
            message: 'Time slot not found'
          });
        }
        
        // Get the max_employees limit - first check in the timeSlot object
        let maxEmployees = timeSlot.max_employees;
        
        // If not there, get it from the time_slot_limits table
        if (maxEmployees === undefined) {
          const limitData = await TimeSlotModel.getTimeSlotLimit(id);
          maxEmployees = limitData ? limitData.max_employees : null;
        }
        
        // If no max_employees set, slot is always available
        if (maxEmployees === null || maxEmployees === undefined) {
          return res.status(200).json({
            success: true,
            available: true,
            max_employees: null,
            current_approved: 0,
            unlimited: true
          });
        }
        
        // Count only approved bookings for this slot on this date - use isTimeSlotAvailable method instead
        // of directly accessing Supabase
        const isAvailable = await TimeSlotModel.isTimeSlotAvailable(id, date);
        
        // Get the count of approved schedules for this slot on this date
        const count = await TimeSlotModel.getApprovedScheduleCount(id, date);
        
        return res.status(200).json({
          success: true,
          available: isAvailable,
          max_employees: maxEmployees,
          current_approved: count,
          debug_info: {
            time_slot_id: id,
            date,
            max_employees: maxEmployees,
            count,
            is_available: isAvailable
          }
        });
      } catch (modelError) {
        console.error('Error checking time slot availability:', modelError);
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Check time slot date availability error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Check availability for multiple time slots at once
  async checkBatchTimeSlotAvailability(req, res) {
    try {
      const { date, timeSlotIds } = req.body;
      
      console.log('=================== BATCH AVAILABILITY REQUEST ===================');
      console.log('Exact date string received from frontend:', date);
      console.log('Date type:', typeof date);
      console.log('Raw request body:', JSON.stringify(req.body));
      
      // Validate required fields
      if (!date || !Array.isArray(timeSlotIds) || timeSlotIds.length === 0) {
        console.log('VALIDATION ERROR - Invalid date or timeSlotIds');
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid date and an array of time slot IDs'
        });
      }
      
      console.log('Raw date received from frontend:', date);
      
      // Parse date components explicitly to avoid timezone issues
      let year, month, day;
      try {
        [year, month, day] = date.split('-');
        console.log(`Parsed date components: year=${year}, month=${month}, day=${day}`);
        
        // Validate the components
        if (!year || !month || !day || 
            isNaN(parseInt(year)) || 
            isNaN(parseInt(month)) || 
            isNaN(parseInt(day))) {
          throw new Error('Invalid date format');
        }
        
        // Create a properly formatted date string
        formattedDate = `${year}-${month}-${day}`;
        console.log('Formatted date string to use:', formattedDate);
        
        // Display exact date as Date object
        const dateObj = new Date(formattedDate);
        console.log('Date as JS Date object:', dateObj.toISOString());
        console.log('Date getFullYear:', dateObj.getFullYear());
        console.log('Date getMonth:', dateObj.getMonth() + 1); // +1 because getMonth is 0-based
        console.log('Date getDate:', dateObj.getDate());
        console.log('Date getDay (day of week):', dateObj.getDay());
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      
      // The date sent by the frontend is already the week start date calculated with the correct
      // system settings. We directly pass it to the model without recalculating.
      console.log('Calling TimeSlotModel.getBatchAvailability with date:', formattedDate);
      const availabilityResults = await TimeSlotModel.getBatchAvailability(formattedDate, timeSlotIds);
      
      return res.status(200).json({
        success: true,
        data: availabilityResults
      });
    } catch (error) {
      console.error('Batch time slot availability check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = TimeSlotController; 