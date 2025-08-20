const ScheduleModel = require('../models/schedule');
const EmployeeModel = require('../models/employee');
const TimeSlotModel = require('../models/timeSlot');
const supabase = require('../config/supabase');

const ScheduleController = {
  // Get all schedules with optional filtering
  async getSchedules(req, res) {
    try {
      // Extract filter parameters from query
      const filters = {
        employee_id: req.query.employee_id,
        date: req.query.date,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        status: req.query.status,
        requested_by: req.query.requested_by
      };
      
      const schedules = await ScheduleModel.getSchedules(filters);
      
      return res.status(200).json({
        success: true,
        data: schedules
      });
    } catch (error) {
      console.error('Get schedules error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get schedule by ID
  async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      
      const schedule = await ScheduleModel.getScheduleById(id);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Get schedule by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get schedules for a specific employee
  async getEmployeeSchedules(req, res) {
    try {
      const { employeeId } = req.params;
      const filters = {
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };
      
      const schedules = await ScheduleModel.getEmployeeSchedules(employeeId, filters);
      
      return res.status(200).json({
        success: true,
        data: schedules
      });
    } catch (error) {
      console.error('Get employee schedules error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Request a new schedule
  async requestSchedule(req, res) {
    try {
      const { 
        employee_id, 
        date, 
        start_time, 
        end_time,
        time_slot_id, 
        notes 
      } = req.body;
      
      // Validate required fields
      if (!employee_id || !date) {
        return res.status(400).json({
          success: false,
          message: 'Please provide employee ID and date'
        });
      }
      
      // Check if we're using a time slot or custom time
      if (!time_slot_id && (!start_time || !end_time)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide either time_slot_id or both start_time and end_time'
        });
      }
      
      // Security check: Ensure non-admin users can only create schedules for themselves
      if (req.user.role !== 'admin') {
        // Get the employee record for the current user
        try {
          const userEmployee = await EmployeeModel.getEmployeeByUserId(req.user.user_id);
          
          if (!userEmployee) {
            return res.status(403).json({
              success: false,
              message: 'You do not have an employee record in the system'
            });
          }
          
          // Check if the employee_id in the request matches the user's employee_id
          if (userEmployee.id !== employee_id) {
            console.error(`Security violation: User ${req.user.user_id} tried to create schedule for employee ${employee_id} but is associated with employee ${userEmployee.id}`);
            return res.status(403).json({
              success: false,
              message: 'You can only create schedules for your own employee record'
            });
          }
        } catch (err) {
          console.error('Error verifying employee record:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify your employee record'
          });
        }
      }
      
      // Create schedule data object
      const scheduleData = {
        employee_id,
        date,
        notes,
        requested_by: req.user.user_id // From auth middleware
      };
      
      // Handle time slot vs custom time
      if (time_slot_id) {
        // Using time slot
        scheduleData.time_slot_id = time_slot_id;
        
        // Get the time slot details to fill in start_time and end_time
        try {
          const timeSlot = await TimeSlotModel.getTimeSlotById(time_slot_id);
          if (!timeSlot) {
            return res.status(404).json({
              success: false,
              message: 'Time slot not found'
            });
          }
          
          // Use the time slot's times
          scheduleData.start_time = timeSlot.start_time;
          scheduleData.end_time = timeSlot.end_time;
        } catch (err) {
          console.error('Error fetching time slot:', err);
          return res.status(500).json({
            success: false,
            message: 'Error fetching time slot details'
          });
        }
      } else {
        // Using custom time
        scheduleData.start_time = start_time;
        scheduleData.end_time = end_time;
      }
      
      try {
        const schedule = await ScheduleModel.requestSchedule(scheduleData);
        
        return res.status(201).json({
          success: true,
          message: 'Schedule request submitted successfully',
          data: schedule
        });
      } catch (modelError) {
        // Handle specific model errors (conflicts, validation)
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Request schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Approve a schedule request
  async approveSchedule(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }
      
      console.log(`Attempting to approve schedule with ID: ${id}`);
      
      // Get the schedule first to verify it exists and is pending
      const schedule = await ScheduleModel.getScheduleById(id);
      
      if (!schedule) {
        console.log(`Schedule not found with ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }
      
      console.log(`Current schedule status: ${schedule.status}`);
      
      if (schedule.status !== 'pending') {
        console.log(`Cannot approve schedule with status: ${schedule.status}`);
        return res.status(400).json({
          success: false,
          message: `Cannot approve a schedule that is already ${schedule.status}`
        });
      }
      
      // Approve the schedule
      const approvedSchedule = await ScheduleModel.approveSchedule(id, req.user.user_id);
      
      console.log(`Schedule approved successfully. New status: ${approvedSchedule.status}`);
      console.log(`Approved schedule details: Date: ${approvedSchedule.date}, TimeSlot: ${approvedSchedule.time_slot_id}`);
      
      return res.status(200).json({
        success: true,
        message: 'Schedule approved successfully',
        data: approvedSchedule
        });
    } catch (error) {
      console.error('Approve schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Reject a schedule request
  async rejectSchedule(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const approverId = req.user.user_id; // From auth middleware
      
      try {
        const schedule = await ScheduleModel.rejectSchedule(id, approverId, rejection_reason);
        
        return res.status(200).json({
          success: true,
          message: 'Schedule rejected successfully',
          data: schedule
        });
      } catch (modelError) {
        // Handle specific model errors
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Reject schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Update an existing schedule
  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { 
        employee_id, 
        date, 
        start_time, 
        end_time, 
        time_slot_id,
        notes, 
        status 
      } = req.body;
      
      // First, check if the schedule exists
      const existingSchedule = await ScheduleModel.getScheduleById(id);
      
      if (!existingSchedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }
      
      // Security check: Non-admin users can only update their own schedules
      if (req.user.role !== 'admin') {
        // Get the employee record for the current user
        try {
          const userEmployee = await EmployeeModel.getEmployeeByUserId(req.user.user_id);
          
          if (!userEmployee) {
            return res.status(403).json({
              success: false,
              message: 'You do not have an employee record in the system'
            });
          }
          
          // Check if the schedule belongs to the user's employee record
          if (existingSchedule.employee_id !== userEmployee.id) {
            console.error(`Security violation: User ${req.user.user_id} tried to update schedule for employee ${existingSchedule.employee_id} but is associated with employee ${userEmployee.id}`);
            return res.status(403).json({
              success: false,
              message: 'You can only update your own schedules'
            });
          }
          
          // Non-admin users can't update status directly
          if (status && status !== existingSchedule.status) {
            return res.status(403).json({
              success: false,
              message: 'Only administrators can change the status of a schedule'
            });
          }
        } catch (err) {
          console.error('Error verifying employee record:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify your employee record'
          });
        }
      }
      
      // Create update data object with only the fields that are provided
      const updateData = {};
      
      if (employee_id) updateData.employee_id = employee_id;
      if (date) updateData.date = date;
      if (notes !== undefined) updateData.notes = notes;
      if (status && req.user.role === 'admin') updateData.status = status;
      
      // Flag to indicate this is an employee update, not an admin update
      if (req.user.role !== 'admin') {
        updateData.is_employee_update = true;
      }
      
      // Handle time slot vs custom time
      if (time_slot_id) {
        // Using time slot
        updateData.time_slot_id = time_slot_id;
        
        // Remove start_time and end_time if they were provided
        delete updateData.start_time;
        delete updateData.end_time;
        
        // Get the time slot details to fill in start_time and end_time
        try {
          const timeSlot = await TimeSlotModel.getTimeSlotById(time_slot_id);
          if (!timeSlot) {
            return res.status(404).json({
              success: false,
              message: 'Time slot not found'
            });
          }
          
          // Use the time slot's times
          updateData.start_time = timeSlot.start_time;
          updateData.end_time = timeSlot.end_time;
        } catch (err) {
          console.error('Error fetching time slot:', err);
          return res.status(500).json({
            success: false,
            message: 'Error fetching time slot details'
          });
        }
      } else {
        // Using custom time
        if (start_time) updateData.start_time = start_time;
        if (end_time) updateData.end_time = end_time;
        
        // Remove time_slot_id if it was previously set
        if (existingSchedule.time_slot_id) {
          updateData.time_slot_id = null;
        }
      }
      
      try {
        const schedule = await ScheduleModel.updateSchedule(id, updateData);
        
        return res.status(200).json({
          success: true,
          message: 'Schedule updated successfully',
          data: schedule
        });
      } catch (modelError) {
        // Handle specific model errors
        return res.status(400).json({
          success: false,
          message: modelError.message
        });
      }
    } catch (error) {
      console.error('Update schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Delete a schedule
  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      
      await ScheduleModel.deleteSchedule(id);
      
      return res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error) {
      console.error('Delete schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Get pending schedule requests
  async getPendingRequests(req, res) {
    try {
      const requests = await ScheduleModel.getPendingRequests();
      
      return res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Get pending requests error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Request a weekly schedule
  async requestWeeklySchedule(req, res) {
    try {
      console.log('Received weekly schedule request:', JSON.stringify(req.body, null, 2));
      
      const { 
        employee_id, 
        week_start_date,
        time_slot_assignments // Array of: { day_of_week: 0-6, time_slot_id: uuid, actual_date?: string }
      } = req.body;
      
      // Debug week start date
      console.log('Week start date as received:', week_start_date);
      console.log('Week start date as Date object:', new Date(week_start_date).toISOString());
      
      // Validate required fields
      if (!employee_id || !week_start_date || !time_slot_assignments || !Array.isArray(time_slot_assignments)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide employee ID, week start date, and time slot assignments'
        });
      }
      
      // Validate week_start_date format
      if (isNaN(Date.parse(week_start_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for week start date. Please use YYYY-MM-DD'
        });
      }
      
      // Security check: Ensure non-admin users can only create schedules for themselves
      if (req.user.role !== 'admin') {
        try {
          // Use user_id from the authenticated user token
          const userEmployee = await EmployeeModel.getEmployeeByUserId(req.user.user_id);
          
          if (!userEmployee) {
            console.error(`No employee record found for user ${req.user.user_id}`);
            return res.status(403).json({
              success: false,
              message: 'You do not have an employee record in the system'
            });
          }
          
          if (userEmployee.id !== employee_id) {
            console.error(`Security violation: User ${req.user.user_id} tried to create schedule for employee ${employee_id} but is associated with employee ${userEmployee.id}`);
            return res.status(403).json({
              success: false,
              message: 'You can only create schedules for your own employee record'
            });
          }
        } catch (err) {
          console.error('Error verifying employee record:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to verify your employee record'
          });
        }
      }
      
      // Create an array to store the created schedules
      const createdSchedules = [];
      const errors = [];
      
      // Get system settings for first day of week
      let systemFirstDayOfWeek = 1; // Default to Monday (1)
      try {
        const { data: settings } = await supabase
          .from('system_settings')
          .select('first_day_of_week')
          .single();
          
        if (settings && settings.first_day_of_week !== undefined) {
          systemFirstDayOfWeek = settings.first_day_of_week;
          console.log(`Using system first day of week setting: ${systemFirstDayOfWeek}`);
        }
      } catch (settingsError) {
        console.error('Error getting system settings:', settingsError);
        // Continue with default value
      }
      
      // For each day in the time_slot_assignments, determine its actual date
      console.log(`Creating schedules based on week start date: ${week_start_date}`);
      
      // Create a schedule for each time slot assignment
      for (const assignment of time_slot_assignments) {
        const { day_of_week, time_slot_id, actual_date } = assignment;
        
        console.log(`Processing schedule assignment:`, assignment);
        
        // Validate day_of_week
        if (day_of_week < 0 || day_of_week > 6) {
          errors.push(`Invalid day of week: ${day_of_week}. Must be between 0 and 6`);
          continue;
        }
        
        console.log(`Processing day position in week: ${day_of_week}`);
        
        // Get the time slot to verify it exists and get its data
        try {
          const timeSlot = await TimeSlotModel.getTimeSlotById(time_slot_id);
          
          if (!timeSlot) {
            errors.push(`Time slot not found with ID: ${time_slot_id}`);
            continue;
          }
          
          // If actual_date is provided, use it DIRECTLY without any date manipulation
          let formattedDate;
          
          if (actual_date) {
            // IMPORTANT: Use the exact date string provided by the frontend
            // DO NOT create a new Date object as it can cause timezone issues
            formattedDate = actual_date;
            console.log(`Using exact provided actual_date without manipulation: ${actual_date}`);
          } else {
            // Fallback to calculating the date based on day_of_week
            // IMPORTANT FIX: We need to properly account for the system first day of week
            // day_of_week is the standard JS day (0=Sunday, 1=Monday, etc.)
            // The week_start_date is the date of the first day of the week based on system settings
            
            const scheduleDate = new Date(week_start_date);
            
            // Calculate the days to add considering the first day of week setting
            // Example: If week starts on Monday (1) and we need Thursday (4), the offset is 3
            //          If week starts on Monday (1) and we need Sunday (0), the offset is 6
            
            // Convert day_of_week and systemFirstDayOfWeek to numbers
            const dayNum = parseInt(day_of_week);
            const firstDayNum = parseInt(systemFirstDayOfWeek);
            
            // Calculate the relative position (days to add to week start date)
            let daysToAdd;
            if (dayNum >= firstDayNum) {
              daysToAdd = dayNum - firstDayNum;
            } else {
              daysToAdd = 7 - firstDayNum + dayNum;
            }
            
            console.log(`Calculating date:
              - Standard day of week value: ${dayNum} (${dayNum === 0 ? 'Sunday' : dayNum === 1 ? 'Monday' : dayNum === 2 ? 'Tuesday' : dayNum === 3 ? 'Wednesday' : dayNum === 4 ? 'Thursday' : dayNum === 5 ? 'Friday' : 'Saturday'})
              - System first day of week: ${firstDayNum} (${firstDayNum === 0 ? 'Sunday' : firstDayNum === 1 ? 'Monday' : firstDayNum === 2 ? 'Tuesday' : firstDayNum === 3 ? 'Wednesday' : firstDayNum === 4 ? 'Thursday' : firstDayNum === 5 ? 'Friday' : 'Saturday'})
              - Days to add to week start: ${daysToAdd}
            `);
            
            scheduleDate.setDate(scheduleDate.getDate() + daysToAdd);
            formattedDate = scheduleDate.toISOString().split('T')[0];
            console.log(`Calculated date from week start: ${formattedDate}`);
          }
          
          // Log details for debugging
          console.log(`Creating schedule with date details:
            - Original actual_date: ${actual_date || 'Not provided'}
            - Final date being used: ${formattedDate}
            - Week start date: ${week_start_date}
            - Day position: ${day_of_week}
            - Time slot: ${time_slot_id}`);
          
          // Check slot availability (capacity limits), not time conflicts
          const isAvailable = await TimeSlotModel.isTimeSlotAvailable(time_slot_id, formattedDate);
          
          if (!isAvailable && req.user.role !== 'admin') {
            errors.push(`Time slot ${time_slot_id} for ${formattedDate} is already at maximum capacity`);
            continue;
          }
          
          // Create the schedule - using createSchedule which skips conflict checking
          const scheduleData = {
            employee_id,
            date: formattedDate,
            time_slot_id,
            week_start_date,
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            status: req.user.role === 'admin' ? 'approved' : 'pending',
            requested_by: req.user.user_id
          };
          
          const schedule = await ScheduleModel.createSchedule(scheduleData);
          createdSchedules.push(schedule);
          
        } catch (err) {
          console.error(`Error scheduling for day ${day_of_week}:`, err);
          errors.push(`Error scheduling for day ${day_of_week}: ${err.message}`);
        }
      }
      
      console.log(`Created ${createdSchedules.length} schedule entries, with ${errors.length} errors`);
      
      // Return the results
      return res.status(201).json({
        success: true,
        message: createdSchedules.length > 0 
          ? `Successfully created ${createdSchedules.length} schedule entries` 
          : 'No schedules were created',
        data: {
          schedules: createdSchedules,
          errors: errors.length > 0 ? errors : null
        }
      });
    } catch (error) {
      console.error('Request weekly schedule error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Bulk schedule operations (admin only)
  async bulkScheduleOperations(req, res) {
    try {
      console.log('Received bulk schedule operations request:', JSON.stringify(req.body, null, 2));
      
      const { 
        newBookings = [], // Array of new schedule requests
        cancellations = [] // Array of schedule IDs to delete
      } = req.body;
      
      // Validate input
      if (!Array.isArray(newBookings) && !Array.isArray(cancellations)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide newBookings and/or cancellations arrays'
        });
      }
      
      const results = {
        newBookings: { success: [], errors: [] },
        cancellations: { success: [], errors: [] }
      };
      
      // Process cancellations first
      for (const scheduleId of cancellations) {
        try {
          await ScheduleModel.deleteSchedule(scheduleId);
          results.cancellations.success.push(scheduleId);
        } catch (err) {
          console.error(`Error canceling schedule ${scheduleId}:`, err);
          results.cancellations.errors.push({
            scheduleId,
            error: err.message
          });
        }
      }
      
      // Process new bookings
      for (const bookingRequest of newBookings) {
        try {
          const { 
            employee_id, 
            date, 
            time_slot_id,
            notes 
          } = bookingRequest;
          
          // Validate required fields
          if (!employee_id || !date || !time_slot_id) {
            results.newBookings.errors.push({
              booking: bookingRequest,
              error: 'Missing required fields: employee_id, date, time_slot_id'
            });
            continue;
          }
          
          // Get the time slot details
          const timeSlot = await TimeSlotModel.getTimeSlotById(time_slot_id);
          if (!timeSlot) {
            results.newBookings.errors.push({
              booking: bookingRequest,
              error: 'Time slot not found'
            });
            continue;
          }
          
          // Create schedule data with auto-approval for admin
          const scheduleData = {
            employee_id,
            date,
            time_slot_id,
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            notes: notes || null,
            status: 'approved', // Auto-approve for admin
            requested_by: req.user.user_id,
            approved_by: req.user.user_id, // Admin auto-approves
            approval_date: new Date().toISOString()
          };
          
          // Create the schedule using createSchedule to allow admin override
          const schedule = await ScheduleModel.createSchedule(scheduleData);
          results.newBookings.success.push(schedule);
          
        } catch (err) {
          console.error('Error creating bulk booking:', err);
          results.newBookings.errors.push({
            booking: bookingRequest,
            error: err.message
          });
        }
      }
      
      const totalSuccessful = results.newBookings.success.length + results.cancellations.success.length;
      const totalErrors = results.newBookings.errors.length + results.cancellations.errors.length;
      
      console.log(`Bulk operation completed: ${totalSuccessful} successful, ${totalErrors} errors`);
      
      return res.status(200).json({
        success: true,
        message: `Bulk operation completed: ${results.newBookings.success.length} bookings created, ${results.cancellations.success.length} bookings canceled`,
        data: results
      });
      
    } catch (error) {
      console.error('Bulk schedule operations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during bulk operations'
      });
    }
  }
};

module.exports = ScheduleController; 
