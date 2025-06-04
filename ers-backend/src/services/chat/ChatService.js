const EmployeeModel = require('../../models/employee');
const ScheduleModel = require('../../models/schedule');
const DepartmentModel = require('../../models/department');
const TimeSlotModel = require('../../models/timeSlot');
const UserModel = require('../../models/user');

class ChatService {
  constructor() {
    // Map of command names to handler functions
    this.commands = {
      help: this.handleHelp,
      profile: this.handleProfile,
      employees: this.handleEmployees,
      departments: this.handleDepartments,
      schedules: this.handleSchedules,
      pending: this.handlePending,
      users: this.handleUsers,
      stats: this.handleStats,
      deptemployees: this.handleDepartmentEmployees,
      request: this.handleRequest,
      approve: this.handleApprove,
      reject: this.handleReject,
      slots: this.handleSlots,
      book: this.handleBook
    };

    // Cache for available slots and pending requests
    this.cache = {
      availableSlots: [],
      pendingRequests: [],
      timestamps: {
        availableSlots: null,
        pendingRequests: null
      }
    };

    // Cache expiration time (5 minutes)
    this.CACHE_EXPIRY_MS = 5 * 60 * 1000;
  }

  /**
   * Process a chat command
   * 
   * @param {string} commandName - The name of the command (without /)
   * @param {Array} args - The arguments for the command
   * @param {Object} user - The current user
   * @returns {Promise<string>} - The response message
   */
  async processCommand(commandName, args, user) {
    // Check if command exists
    if (!this.commands[commandName]) {
      return `Unknown command: /${commandName}. Type /help to see available commands.`;
    }

    // Check if user is admin for admin-only commands
    const isAdmin = user.role === 'admin';
    const adminCommands = ['users', 'stats', 'pending', 'approve', 'reject'];
    
    if (adminCommands.includes(commandName) && !isAdmin) {
      return 'This command is only available to administrators.';
    }

    try {
      // Execute the command handler
      return await this.commands[commandName].call(this, args, user);
    } catch (error) {
      console.error(`Error processing command /${commandName}:`, error);
      return `Error processing command: ${error.message || 'Unknown error'}`;
    }
  }

  /**
   * Handle the help command
   */
  async handleHelp(args, user) {
    const isAdmin = user.role === 'admin';
    
    // Define commands with descriptions
    const allCommands = {
      help: 'Show available commands',
      profile: 'View your profile information',
      employees: 'List all employees',
      departments: 'List all departments',
      schedules: 'View your upcoming schedules',
      slots: 'View available slots for this week',
      book: 'Book a slot by its number (format: /book [slot_number])',
      deptemployees: 'View employees in a specific department',
      request: 'Request time off (format: /request YYYY-MM-DD HH:MM HH:MM)',
      // Admin only commands
      pending: 'Show pending schedule requests (Admin only)',
      approve: 'Approve pending requests by number (format: /approve [number1,number2,...] or /approve all)',
      reject: 'Reject pending requests by number (format: /reject [number1,number2,...] reason or /reject all reason)',
      users: 'List all users (Admin only)',
      stats: 'Show system statistics (Admin only)'
    };

    // Filter commands based on user role
    const filteredCommands = Object.entries(allCommands)
      .filter(([cmd]) => isAdmin || !['pending', 'approve', 'reject', 'users', 'stats'].includes(cmd))
      .map(([cmd, desc]) => `/${cmd} - ${desc}`)
      .join('\n');

    return `Available commands:\n${filteredCommands}`;
  }

  /**
   * Handle the profile command
   */
  async handleProfile(args, user) {
    if (!user) return 'You are not logged in.';
    
    return `Profile Information:
Name: ${user.name || 'Not set'}
Email: ${user.email}
Role: ${user.role}`;
  }

  /**
   * Handle the employees command
   */
  async handleEmployees(args, user) {
    try {
      const employees = await EmployeeModel.getAllEmployees();
      
      if (!employees || employees.length === 0) {
        return 'No employees found.';
      }
      
      return `Employees (${employees.length}):\n${employees.map(emp => 
        `- ${emp.name}, ${emp.position}`
      ).join('\n')}`;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return 'Error fetching employees.';
    }
  }

  /**
   * Handle the departments command
   */
  async handleDepartments(args, user) {
    try {
      const departments = await DepartmentModel.getAllDepartments();
      
      if (!departments || departments.length === 0) {
        return 'No departments found.';
      }
      
      return `Departments (${departments.length}):\n${departments.map(dept => 
        `- ${dept.name}`
      ).join('\n')}`;
    } catch (error) {
      console.error('Error fetching departments:', error);
      return 'Error fetching departments.';
    }
  }

  /**
   * Handle the schedules command
   */
  async handleSchedules(args, user) {
    try {
      // First get the user's employee record
      const employees = await EmployeeModel.getAllEmployees();
      const userEmployee = employees.find(emp => 
        emp.email === user.email
      );
      
      if (!userEmployee) {
        return 'You do not have an employee profile.';
      }
      
      // Now get the schedules
      const schedules = await ScheduleModel.getSchedules({ employee_id: userEmployee.id });
      
      if (!schedules || schedules.length === 0) {
        return 'No upcoming schedules found.';
      }
      
      const today = new Date();
      
      return `Your Upcoming Schedules:\n${schedules
        .filter(sched => new Date(sched.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5)
        .map(sched => {
          const date = new Date(sched.date).toLocaleDateString();
          return `- ${date}: ${sched.start_time.substring(0, 5)} to ${sched.end_time.substring(0, 5)}`;
        }).join('\n')}`;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return 'Error fetching schedules.';
    }
  }

  /**
   * Handle the pending command
   */
  async handlePending(args, user) {
    if (user.role !== 'admin') {
      return 'This command is only available to administrators.';
    }
    
    try {
      // Fetch schedules with pending status
      const pendingSchedules = await ScheduleModel.getSchedules({ status: 'pending' });
      
      if (!pendingSchedules || pendingSchedules.length === 0) {
        return 'No pending schedule requests.';
      }
      
      // Cache the pending requests for the approve command
      this.cache.pendingRequests = pendingSchedules;
      this.cache.timestamps.pendingRequests = Date.now();
      
      // Format with serial numbers
      const pendingOutput = pendingSchedules.map((sched, index) => {
        const date = new Date(sched.date).toLocaleDateString();
        const empName = sched.employee?.name || 'Unknown';
        const requestId = sched.id;
        
        return `${index + 1}. ${empName} on ${date}: ${sched.start_time.substring(0, 5)} to ${sched.end_time.substring(0, 5)} [ID: ${requestId}]`;
      }).join('\n');
      
      return `Pending Schedule Requests (${pendingSchedules.length}):\n${pendingOutput}\n\nTo approve, type /approve followed by the request number(s) (e.g., /approve 1,3) or /approve all to approve all requests.`;
    } catch (error) {
      console.error('Error fetching pending schedules:', error);
      return 'Error fetching pending schedules.';
    }
  }

  /**
   * Handle the users command
   */
  async handleUsers(args, user) {
    if (user.role !== 'admin') {
      return 'This command is only available to administrators.';
    }
    
    try {
      const users = await UserModel.getAllUsers();
      
      if (!users || users.length === 0) {
        return 'No users found.';
      }
      
      return `Users (${users.length}):\n${users.map(user => 
        `- ${user.name} (${user.email}): ${user.role}`
      ).join('\n')}`;
    } catch (error) {
      console.error('Error fetching users:', error);
      return 'Error fetching users.';
    }
  }

  /**
   * Handle the stats command
   */
  async handleStats(args, user) {
    if (user.role !== 'admin') {
      return 'This command is only available to administrators.';
    }
    
    try {
      const employees = await EmployeeModel.getAllEmployees();
      const departments = await DepartmentModel.getAllDepartments();
      const users = await UserModel.getAllUsers();
      
      return `System Statistics:
Total Employees: ${employees?.length || 0}
Total Departments: ${departments?.length || 0}
Total Users: ${users?.length || 0}
Admin Users: ${users?.filter(u => u.role === 'admin').length || 0}`;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return 'Error fetching statistics.';
    }
  }

  /**
   * Handle the deptemployees command
   */
  async handleDepartmentEmployees(args, user) {
    try {
      // Get departments first
      const departments = await DepartmentModel.getAllDepartments();
      
      if (!departments || departments.length === 0) {
        return 'No departments available.';
      }
      
      // Get all employees
      const employees = await EmployeeModel.getAllEmployees();
      
      if (!employees || employees.length === 0) {
        return 'No employees found.';
      }
      
      // Group employees by department
      const departmentList = departments.map(dept => {
        const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
        return {
          name: dept.name,
          employees: deptEmployees
        };
      });
      
      return departmentList.map(dept => {
        return `Department: ${dept.name} (${dept.employees.length} employees)
${dept.employees.length > 0 
? dept.employees.map(emp => `- ${emp.name}, ${emp.position}`).join('\n')
: '- No employees'
}`;
      }).join('\n\n');
    } catch (error) {
      console.error('Error fetching department employees:', error);
      return 'Error fetching department employees.';
    }
  }

  /**
   * Handle the request command
   */
  async handleRequest(args, user) {
    // Check if the user provided the required arguments
    if (!args || args.length < 3) {
      return 'Please provide date and time range in format: /request YYYY-MM-DD HH:MM HH:MM';
    }
    
    const [date, startTime, endTime] = args;
    
    // Validate the date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return 'Invalid date format. Please use YYYY-MM-DD format.';
    }
    
    // Validate the time format
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return 'Invalid time format. Please use HH:MM format.';
    }
    
    try {
      // First get the user's employee record
      const employees = await EmployeeModel.getAllEmployees();
      const userEmployee = employees.find(emp => 
        emp.email === user.email
      );
      
      if (!userEmployee) {
        return 'You do not have an employee profile. Please contact an administrator.';
      }
      
      // Submit the schedule request
      const scheduleData = {
        employee_id: userEmployee.id,
        date,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        notes: 'Requested via EnvoyAI',
        requested_by: user.id || user.user_id
      };
      
      const schedule = await ScheduleModel.requestSchedule(scheduleData);
      
      if (schedule) {
        return 'Time off request submitted successfully! Your request is pending approval.';
      } else {
        return 'Failed to submit time off request. Please try again later.';
      }
    } catch (error) {
      console.error('Error submitting time off request:', error);
      
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      return 'Error submitting time off request. Please try again later.';
    }
  }

  /**
   * Handle the approve command
   */
  async handleApprove(args, user) {
    if (user.role !== 'admin') {
      return 'This command is only available to administrators.';
    }
    
    if (!args || args.length < 1) {
      return 'Please provide the request number(s) to approve (e.g., /approve 1,3) or /approve all to approve all requests.';
    }
    
    // Check if cache is expired
    if (!this.cache.timestamps.pendingRequests || 
        Date.now() - this.cache.timestamps.pendingRequests > this.CACHE_EXPIRY_MS) {
      return 'Please run /pending first to see pending requests before approving.';
    }
    
    if (this.cache.pendingRequests.length === 0) {
      return 'There are no pending requests to approve.';
    }
    
    try {
      let requestsToApprove = [];
      
      // Handle "all" option
      if (args[0].toLowerCase() === 'all') {
        requestsToApprove = this.cache.pendingRequests.map((_, index) => index + 1);
      } else {
        // Parse comma-separated numbers
        const requestNumbers = args[0].split(',').map(num => parseInt(num.trim()));
        
        // Validate all numbers
        for (const num of requestNumbers) {
          if (isNaN(num) || num < 1 || num > this.cache.pendingRequests.length) {
            return `Invalid request number: ${num}. Please choose numbers between 1 and ${this.cache.pendingRequests.length}.`;
          }
        }
        
        requestsToApprove = requestNumbers;
      }
      
      // Approve each request
      const approvalResults = [];
      
      for (const requestNum of requestsToApprove) {
        const requestId = this.cache.pendingRequests[requestNum - 1].id;
        
        try {
          // Update the schedule with approved status
          const approvedSchedule = await ScheduleModel.updateSchedule(requestId, {
            status: 'approved',
            approved_by: user.id || user.user_id,
            approval_date: new Date().toISOString()
          });
          
          if (approvedSchedule) {
            approvalResults.push({ 
              number: requestNum, 
              success: true 
            });
          } else {
            approvalResults.push({ 
              number: requestNum, 
              success: false, 
              message: 'Request failed' 
            });
          }
        } catch (error) {
          approvalResults.push({ 
            number: requestNum, 
            success: false, 
            message: error.message || 'Request failed' 
          });
        }
      }
      
      // Format results
      const successCount = approvalResults.filter(r => r.success).length;
      const failCount = approvalResults.length - successCount;
      
      let resultMessage = `Approval complete: ${successCount} request(s) approved`;
      if (failCount > 0) {
        resultMessage += `, ${failCount} failed.`;
        
        // Add details for failed requests
        const failedDetails = approvalResults
          .filter(r => !r.success)
          .map(r => `Request #${r.number}: ${r.message}`)
          .join('\n');
        
        resultMessage += `\nFailed requests:\n${failedDetails}`;
      } else {
        resultMessage += '.';
      }
      
      // Clear the cache after approval
      this.cache.timestamps.pendingRequests = null;
      
      return resultMessage;
    } catch (error) {
      console.error('Error approving requests:', error);
      
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      return 'Error approving requests. Please try again later.';
    }
  }

  /**
   * Handle the reject command
   */
  async handleReject(args, user) {
    if (user.role !== 'admin') {
      return 'This command is only available to administrators.';
    }
    
    if (!args || args.length < 1) {
      return 'Please provide the request number(s) to reject and an optional reason (e.g., /reject 1,3 schedule conflict).';
    }
    
    // Check if cache is expired
    if (!this.cache.timestamps.pendingRequests || 
        Date.now() - this.cache.timestamps.pendingRequests > this.CACHE_EXPIRY_MS) {
      return 'Please run /pending first to see pending requests before rejecting.';
    }
    
    if (this.cache.pendingRequests.length === 0) {
      return 'There are no pending requests to reject.';
    }
    
    try {
      let requestsToReject = [];
      let rejectionReason = "Rejected via EnvoyAI";
      
      // Handle "all" option
      if (args[0].toLowerCase() === 'all') {
        requestsToReject = this.cache.pendingRequests.map((_, index) => index + 1);
        rejectionReason = args.slice(1).join(' ') || rejectionReason;
      } else {
        // Check if first argument is comma-separated numbers
        const firstArg = args[0];
        if (/^[\d,]+$/.test(firstArg)) {
          // Parse comma-separated numbers
          const requestNumbers = firstArg.split(',').map(num => parseInt(num.trim()));
          
          // Validate all numbers
          for (const num of requestNumbers) {
            if (isNaN(num) || num < 1 || num > this.cache.pendingRequests.length) {
              return `Invalid request number: ${num}. Please choose numbers between 1 and ${this.cache.pendingRequests.length}.`;
            }
          }
          
          requestsToReject = requestNumbers;
          rejectionReason = args.slice(1).join(' ') || rejectionReason;
        } else {
          // Single number followed by reason
          const requestNum = parseInt(args[0]);
          if (isNaN(requestNum) || requestNum < 1 || requestNum > this.cache.pendingRequests.length) {
            return `Invalid request number: ${args[0]}. Please choose a number between 1 and ${this.cache.pendingRequests.length}.`;
          }
          
          requestsToReject = [requestNum];
          rejectionReason = args.slice(1).join(' ') || rejectionReason;
        }
      }
      
      // Reject each request
      const rejectionResults = [];
      
      for (const requestNum of requestsToReject) {
        const requestId = this.cache.pendingRequests[requestNum - 1].id;
        
        try {
          // Update the schedule with rejected status
          const rejectedSchedule = await ScheduleModel.updateSchedule(requestId, {
            status: 'rejected',
            rejected_by: user.id || user.user_id,
            rejection_date: new Date().toISOString(),
            notes: rejectionReason
          });
          
          if (rejectedSchedule) {
            rejectionResults.push({ 
              number: requestNum, 
              success: true 
            });
          } else {
            rejectionResults.push({ 
              number: requestNum, 
              success: false, 
              message: 'Request failed' 
            });
          }
        } catch (error) {
          rejectionResults.push({ 
            number: requestNum, 
            success: false, 
            message: error.message || 'Request failed' 
          });
        }
      }
      
      // Format results
      const successCount = rejectionResults.filter(r => r.success).length;
      const failCount = rejectionResults.length - successCount;
      
      let resultMessage = `Rejection complete: ${successCount} request(s) rejected`;
      if (failCount > 0) {
        resultMessage += `, ${failCount} failed.`;
        
        // Add details for failed requests
        const failedDetails = rejectionResults
          .filter(r => !r.success)
          .map(r => `Request #${r.number}: ${r.message}`)
          .join('\n');
        
        resultMessage += `\nFailed requests:\n${failedDetails}`;
      } else {
        resultMessage += '.';
      }
      
      // Clear the cache after rejection
      this.cache.timestamps.pendingRequests = null;
      
      return resultMessage;
    } catch (error) {
      console.error('Error rejecting requests:', error);
      
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      return 'Error rejecting requests. Please try again later.';
    }
  }

  /**
   * Handle the slots command
   */
  async handleSlots(args, user) {
    try {
      // Get the current date
      const today = new Date();
      
      // Calculate the week start date (Sunday)
      const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const weekStartDate = new Date(today);
      weekStartDate.setDate(today.getDate() - dayOfWeek);
      
      // Format the date as YYYY-MM-DD
      const formattedDate = weekStartDate.toISOString().split('T')[0];
      
      // Get all time slots
      const allTimeSlots = await TimeSlotModel.getTimeSlots();
      
      if (!allTimeSlots || allTimeSlots.length === 0) {
        return 'No time slots found.';
      }
      
      // Check availability for each time slot for this week
      const availableSlots = [];
      
      for (const slot of allTimeSlots) {
        // Get availability for this slot
        const slotDate = new Date(weekStartDate);
        slotDate.setDate(weekStartDate.getDate() + slot.day_of_week);
        const formattedSlotDate = slotDate.toISOString().split('T')[0];
        
        // Check if the slot is available on this date
        const isAvailable = await TimeSlotModel.isTimeSlotAvailable(slot.id, formattedSlotDate);
        
        // Get current booking count
        const currentCount = await TimeSlotModel.getCurrentBookingCount(slot.id, formattedDate);
        
        // Get the max employees limit
        let maxEmployees = slot.max_employees;
        if (maxEmployees === undefined) {
          const limitData = await TimeSlotModel.getTimeSlotLimit(slot.id);
          maxEmployees = limitData ? limitData.max_employees : null;
        }
        
        // Map day numbers to names
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[slot.day_of_week];
        
        // Format the date for display
        const displayDate = slotDate.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Format time
        const startTime = slot.start_time.substring(0, 5);
        const endTime = slot.end_time.substring(0, 5);
        
        // Calculate available spots
        const availableSpots = maxEmployees === null ? 'unlimited' : maxEmployees - currentCount;
        
        // Check if the slot is in the past using the same logic as frontend
        const now = new Date();
        let isPast = false;
        
        // If the date is before today, it's definitely in the past
        if (slotDate.getFullYear() < now.getFullYear() ||
            (slotDate.getFullYear() === now.getFullYear() && slotDate.getMonth() < now.getMonth()) ||
            (slotDate.getFullYear() === now.getFullYear() && slotDate.getMonth() === now.getMonth() && 
            slotDate.getDate() < now.getDate())) {
          isPast = true;
        }
        
        // If it's today, check the actual time
        if (slotDate.getFullYear() === now.getFullYear() && 
            slotDate.getMonth() === now.getMonth() && 
            slotDate.getDate() === now.getDate()) {
          
          // Parse the time from the slot
          const [hours, minutes] = startTime.split(':').map(Number);
          
          // Create date object for the time slot start time
          const slotStartTime = new Date(slotDate);
          slotStartTime.setHours(hours, minutes, 0, 0);
          
          // If current time is past the slot start time, consider it past
          if (now >= slotStartTime) {
            isPast = true;
          }
        }
        
        availableSlots.push({
          id: slot.id,
          dayName,
          dayNumber: slot.day_of_week,
          date: displayDate,
          dateObj: slotDate,
          time: `${startTime} - ${endTime}`,
          startTime,
          endTime,
          name: slot.name || '',
          availableSpots,
          rawDate: slotDate.toISOString().split('T')[0],
          isPast
        });
      }
      
      // Sort by day of week
      availableSlots.sort((a, b) => a.dayNumber - b.dayNumber);
      
      // Cache the available slots for the book command
      this.cache.availableSlots = availableSlots;
      this.cache.timestamps.availableSlots = Date.now();
      
      // Format the output with serial numbers
      const slotsOutput = availableSlots.map((slot, index) => {
        const spotText = slot.availableSpots === 'unlimited' ? 
          'unlimited spots' : 
          `${slot.availableSpots} spot${slot.availableSpots !== 1 ? 's' : ''} available`;
        
        let statusText = '';
        if (slot.isPast) {
          statusText = ' [PAST - Cannot book]';
        }
        
        return `${index + 1}. ${slot.dayName} (${slot.date}), ${slot.time} ${slot.name ? `(${slot.name})` : ''}: ${spotText}${statusText}`;
      }).join('\n');
      
      return `Available Slots for Week of ${weekStartDate.toLocaleDateString()}:\n${slotsOutput}\n\nTo book a slot, type /book followed by the slot number (e.g. /book 3)`;
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return 'Error fetching available slots.';
    }
  }

  /**
   * Handle the book command
   */
  async handleBook(args, user) {
    try {
      // Check if args were provided
      if (!args || args.length < 1) {
        return 'Please provide the slot number to book (e.g., /book 3)';
      }
      
      // Parse the slot number
      const slotNumber = parseInt(args[0]);
      if (isNaN(slotNumber) || slotNumber < 1) {
        return 'Please provide a valid slot number.';
      }
      
      // Check if cache is expired
      if (!this.cache.timestamps.availableSlots || 
          Date.now() - this.cache.timestamps.availableSlots > this.CACHE_EXPIRY_MS) {
        return 'Please run /slots first to see available slots before booking.';
      }
      
      // Check if the slot number is valid
      if (slotNumber > this.cache.availableSlots.length) {
        return `Invalid slot number. Please choose a number between 1 and ${this.cache.availableSlots.length}.`;
      }
      
      // Get the selected slot
      const selectedSlot = this.cache.availableSlots[slotNumber - 1];
      
      // Check if the slot is in the past (using exactly the same logic as frontend)
      if (selectedSlot.isPast) {
        return `Cannot book slot ${slotNumber} as it has already passed.`;
      }
      
      // Check if the slot has available spots
      if (selectedSlot.availableSpots !== 'unlimited' && selectedSlot.availableSpots <= 0) {
        return `Sorry, slot ${slotNumber} has no available spots.`;
      }
      
      // First get the user's employee record
      const employees = await EmployeeModel.getAllEmployees();
      const userEmployee = employees.find(emp => 
        emp.email === user.email
      );
      
      if (!userEmployee) {
        return 'You do not have an employee profile. Please contact an administrator.';
      }
      
      // Submit the schedule request
      const scheduleData = {
        employee_id: userEmployee.id,
        date: selectedSlot.rawDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        status: 'pending',
        notes: `Booked via EnvoyAI for ${selectedSlot.name || selectedSlot.time}`,
        requested_by: user.id || user.user_id,
        time_slot_id: selectedSlot.id
      };
      
      const schedule = await ScheduleModel.requestSchedule(scheduleData);
      
      if (schedule) {
        return `Successfully booked slot ${slotNumber}: ${selectedSlot.dayName} (${selectedSlot.date}), ${selectedSlot.time}. Your booking is pending approval.`;
      } else {
        return 'Failed to book the slot. Please try again later.';
      }
    } catch (error) {
      console.error('Error booking slot:', error);
      
      if (error.message) {
        return `Error: ${error.message}`;
      }
      
      return 'Error booking the slot. Please try again later.';
    }
  }
}

module.exports = new ChatService();