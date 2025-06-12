const EmployeeModel = require('../../models/employee');
const ScheduleModel = require('../../models/schedule');
const DepartmentModel = require('../../models/department');
const TimeSlotModel = require('../../models/timeSlot');
const UserModel = require('../../models/user');
const OpenAIService = require('./OpenAIService');
const SystemSettingsModel = require('../../models/systemSettings');

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
      },
      chatHistory: {} // Store chat history by user ID
    };

    // Cache expiration time (5 minutes)
    this.CACHE_EXPIRY_MS = 5 * 60 * 1000;
    
    // Define tools for OpenAI
    this.aiTools = {
      getAllEmployees: async () => {
        return await EmployeeModel.getAllEmployees();
      },
      getEmployeeById: async ({ id }) => {
        return await EmployeeModel.getEmployeeById(id);
      },
      getAllDepartments: async () => {
        return await DepartmentModel.getAllDepartments();
      },
      getUserSchedules: async ({ userId = null } = {}, context = {}) => {
        // Use the context user if userId is not provided
        const targetUserId = userId || context.user?.id || context.user?.user_id;
        
        if (!targetUserId) {
          return { error: 'User ID not found' };
        }
        
        // First get the user's employee record
        const employees = await EmployeeModel.getAllEmployees();
        const userEmployee = employees.find(emp => 
          emp.user_id === targetUserId || emp.email === context.user?.email
        );
        
        if (!userEmployee) {
          return { error: 'Employee profile not found' };
        }
        
        return await ScheduleModel.getSchedules({ employee_id: userEmployee.id });
      },
      getPendingSchedules: async (_, context = {}) => {
        // Check if user is admin
        if (context.user?.role !== 'admin') {
          return { error: 'This function is only available to administrators' };
        }
        return await ScheduleModel.getSchedules({ status: 'pending' });
      },
      getAvailableTimeSlots: async () => {
        try {
          console.log(`[DEBUG-SLOTS] getAvailableTimeSlots called`);
          // This implementation mirrors the handleSlots function
          // Get the current date
          const today = new Date();
          
          // Calculate the week start date (Sunday)
          const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
          const weekStartDate = new Date(today);
          weekStartDate.setDate(today.getDate() - dayOfWeek);
          
          // Format the date as YYYY-MM-DD
          const formattedDate = weekStartDate.toISOString().split('T')[0];
          console.log(`[DEBUG-SLOTS] Week start date: ${formattedDate}`);
          
          // Get all time slots
          const allTimeSlots = await TimeSlotModel.getTimeSlots();
          console.log(`[DEBUG-SLOTS] Retrieved ${allTimeSlots.length} time slots`);
          
          if (!allTimeSlots || allTimeSlots.length === 0) {
            console.log(`[DEBUG-SLOTS] No time slots found`);
            return { error: 'No time slots found' };
          }
          
          // Process each slot to check availability
          const availableSlots = [];
          
          for (const slot of allTimeSlots) {
            // Get the date for this slot
            const slotDate = new Date(weekStartDate);
            slotDate.setDate(weekStartDate.getDate() + slot.day_of_week);
            const formattedSlotDate = slotDate.toISOString().split('T')[0];
            
            // Get current booking count and max employees limit
            let currentCount = 0;
            let maxEmployees = slot.max_employees;
            
            try {
              // Try to get current booking count
              if (TimeSlotModel.getCurrentBookingCount) {
                currentCount = await TimeSlotModel.getCurrentBookingCount(slot.id, formattedSlotDate);
              }
              
              // Try to get max employees limit if not already set
              if (maxEmployees === undefined && TimeSlotModel.getTimeSlotLimit) {
                const limitData = await TimeSlotModel.getTimeSlotLimit(slot.id);
                maxEmployees = limitData ? limitData.max_employees : null;
              }
            } catch (error) {
              console.error('[DEBUG-SLOTS] Error getting slot details:', error);
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
            
            // Check if the slot is in the past
            const now = new Date();
            let isPast = false;
            
            if (slotDate < now) {
              isPast = true;
            } else if (
              slotDate.getFullYear() === now.getFullYear() && 
              slotDate.getMonth() === now.getMonth() && 
              slotDate.getDate() === now.getDate()
            ) {
              // If it's today, check the time
              const [hours, minutes] = startTime.split(':').map(Number);
              const slotStartTime = new Date(slotDate);
              slotStartTime.setHours(hours, minutes, 0, 0);
              
              if (now >= slotStartTime) {
                isPast = true;
              }
            }
            
            availableSlots.push({
              id: slot.id,
              dayName,
              date: displayDate,
              time: `${startTime} - ${endTime}`,
              name: slot.name || '',
              availableSpots,
              isPast
            });
          }
          
          // Sort by day of week
          availableSlots.sort((a, b) => {
            const daysOrder = {'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6};
            return daysOrder[a.dayName] - daysOrder[b.dayName];
          });
          
          console.log(`[DEBUG-SLOTS] Returning ${availableSlots.length} available slots`);
          console.log(`[DEBUG-SLOTS] First few slots:`, JSON.stringify(availableSlots.slice(0, 2), null, 2));
          
          return availableSlots;
        } catch (error) {
          console.error('[DEBUG-SLOTS] Error getting available time slots:', error);
          return { error: 'Error fetching available slots' };
        }
      },
      bookTimeSlot: async ({ slotId, date = null, notes = '' } = {}, context = {}) => {
        try {
          console.log(`[DEBUG-BOOKING] AI bookTimeSlot called with:
            - slotId: ${slotId}
            - date: ${date || 'not provided'}
            - notes: ${notes || 'not provided'}
            - context.user: ${JSON.stringify(context.user || {})}
          `);
          
          if (!slotId) {
            console.log(`[DEBUG-BOOKING] Error: Slot ID is required`);
            return { error: 'Slot ID is required' };
          }
          
          if (!context.user) {
            console.log(`[DEBUG-BOOKING] Error: User information is required`);
            return { error: 'User information is required' };
          }
          
          console.log(`[DEBUG-BOOKING] Attempting to book slot with ID: ${slotId}`);
          
          // Get all time slots to find the one with the given ID
          const allTimeSlots = await TimeSlotModel.getTimeSlots();
          console.log(`[DEBUG-BOOKING] Retrieved ${allTimeSlots.length} time slots`);
          
          // Try to find the slot by exact ID match first
          let selectedSlot = allTimeSlots.find(slot => slot.id === slotId);
          
          if (selectedSlot) {
            console.log(`[DEBUG-BOOKING] Found slot by exact ID match: ${JSON.stringify(selectedSlot)}`);
          } else {
            console.log(`[DEBUG-BOOKING] Exact ID match not found, trying alternative methods`);
          }
          
          if (!selectedSlot && /^\d+$/.test(slotId)) {
            // Get available slots in the same order as they would be displayed to the user
            const availableSlots = [];
            
            // Get the current date
            const today = new Date();
            
            // Get the system's first day of week setting (0 = Sunday, 1 = Monday, etc.)
            const systemSettings = await SystemSettingsModel.getSettings();
            const firstDayOfWeek = systemSettings?.first_day_of_week || 0; // Default to Sunday
            
            // Calculate the week start date based on the system setting
            const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            let daysToSubtract;
            
            if (dayOfWeek >= firstDayOfWeek) {
              daysToSubtract = dayOfWeek - firstDayOfWeek;
            } else {
              daysToSubtract = dayOfWeek + 7 - firstDayOfWeek;
            }
            
            const weekStartDate = new Date(today);
            weekStartDate.setDate(today.getDate() - daysToSubtract);
            
            console.log(`[DEBUG] AI calculated week start date: ${weekStartDate.toISOString().split('T')[0]}`);
            
            // Process each slot to check if it's available and not in the past
            for (const slot of allTimeSlots) {
              const slotDate = new Date(weekStartDate);
              slotDate.setDate(weekStartDate.getDate() + slot.day_of_week);
              
              const now = new Date();
              let isPast = false;
              
              if (slotDate < now) {
                isPast = true;
              } else if (
                slotDate.getFullYear() === now.getFullYear() && 
                slotDate.getMonth() === now.getMonth() && 
                slotDate.getDate() === now.getDate()
              ) {
                // If it's today, check the time
                const startTime = slot.start_time.substring(0, 5);
                const [hours, minutes] = startTime.split(':').map(Number);
                const slotStartTime = new Date(slotDate);
                slotStartTime.setHours(hours, minutes, 0, 0);
                
                if (now >= slotStartTime) {
                  isPast = true;
                }
              }
              
              if (!isPast) {
                // Add formatted date to the slot object
                const formattedSlotDate = slotDate.toISOString().split('T')[0];
                availableSlots.push({
                  ...slot,
                  calculatedDate: formattedSlotDate
                });
              }
            }
            
            // Sort available slots by day of week
            availableSlots.sort((a, b) => a.day_of_week - b.day_of_week);
            
            // Try to get the slot by index (1-based)
            const index = parseInt(slotId) - 1;
            if (index >= 0 && index < availableSlots.length) {
              selectedSlot = availableSlots[index];
              console.log(`[DEBUG] Found slot by index ${index}:`, selectedSlot.id);
            }
          }
          
          if (!selectedSlot) {
            // Try to find by day name if the slotId looks like a day name
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const normalizedSlotId = slotId.toLowerCase();
            const dayIndex = dayNames.findIndex(day => day.includes(normalizedSlotId));
            
            if (dayIndex !== -1) {
              // Find slots for this day
              const slotsForDay = allTimeSlots.filter(slot => slot.day_of_week === dayIndex);
              
              // Get the first available slot for this day
              if (slotsForDay.length > 0) {
                // Get the system's first day of week setting (0 = Sunday, 1 = Monday, etc.)
                const systemSettings = await SystemSettingsModel.getSettings();
                const firstDayOfWeek = systemSettings?.first_day_of_week || 0; // Default to Sunday
                
                const now = new Date();
                const today = new Date();
                const dayOfWeek = today.getDay();
                
                // Calculate the week start date based on the system setting
                let daysToSubtract;
                
                if (dayOfWeek >= firstDayOfWeek) {
                  daysToSubtract = dayOfWeek - firstDayOfWeek;
                } else {
                  daysToSubtract = dayOfWeek + 7 - firstDayOfWeek;
                }
                
                const weekStartDate = new Date(today);
                weekStartDate.setDate(today.getDate() - daysToSubtract);
                
                // Find the first non-past slot
                for (const slot of slotsForDay) {
                  const slotDate = new Date(weekStartDate);
                  slotDate.setDate(weekStartDate.getDate() + slot.day_of_week);
                  
                  let isPast = false;
                  
                  if (slotDate < now) {
                    isPast = true;
                  } else if (
                    slotDate.getFullYear() === now.getFullYear() && 
                    slotDate.getMonth() === now.getMonth() && 
                    slotDate.getDate() === now.getDate()
                  ) {
                    // If it's today, check the time
                    const startTime = slot.start_time.substring(0, 5);
                    const [hours, minutes] = startTime.split(':').map(Number);
                    const slotStartTime = new Date(slotDate);
                    slotStartTime.setHours(hours, minutes, 0, 0);
                    
                    if (now >= slotStartTime) {
                      isPast = true;
                    }
                  }
                  
                  if (!isPast) {
                    const formattedSlotDate = slotDate.toISOString().split('T')[0];
                    selectedSlot = {
                      ...slot,
                      calculatedDate: formattedSlotDate
                    };
                    console.log(`[DEBUG] Found slot by day name ${dayNames[dayIndex]}:`, selectedSlot.id);
                    break;
                  }
                }
              }
            }
          }
          
          if (!selectedSlot) {
            return { error: `Time slot with ID ${slotId} not found. Please use the exact ID from the available slots list.` };
          }
          
          // Use the provided date or the calculated date from the slot
          let formattedDate;
          
          try {
            if (date) {
              formattedDate = date;
              console.log(`[DEBUG-BOOKING] Using provided date: ${formattedDate}`);
            } else if (selectedSlot.calculatedDate) {
              formattedDate = selectedSlot.calculatedDate;
              console.log(`[DEBUG-BOOKING] Using calculatedDate from slot: ${formattedDate}`);
            } else {
              // Calculate the date based on the slot's day of week
              console.log(`[DEBUG-BOOKING] Calculating date from day of week: ${selectedSlot.day_of_week}`);
              
              // Get the system's first day of week setting (0 = Sunday, 1 = Monday, etc.)
              const systemSettings = await SystemSettingsModel.getSettings();
              const firstDayOfWeek = systemSettings?.first_day_of_week || 0; // Default to Sunday
              
              // Calculate the week start date based on the system setting
              const today = new Date();
              const dayOfWeek = today.getDay();
              let daysToSubtract;
              
              if (dayOfWeek >= firstDayOfWeek) {
                daysToSubtract = dayOfWeek - firstDayOfWeek;
              } else {
                daysToSubtract = dayOfWeek + 7 - firstDayOfWeek;
              }
              
              const weekStartDate = new Date(today);
              weekStartDate.setDate(today.getDate() - daysToSubtract);
              
              // Calculate the date for this slot
              const slotDate = new Date(weekStartDate);
              slotDate.setDate(weekStartDate.getDate() + selectedSlot.day_of_week);
              
              // Format the date as YYYY-MM-DD
              formattedDate = slotDate.toISOString().split('T')[0];
              console.log(`[DEBUG-BOOKING] Calculated date: ${formattedDate}`);
            }
          } catch (dateError) {
            console.error('[DEBUG-BOOKING] Error calculating date:', dateError);
            return { 
              error: 'Error calculating booking date',
              suggestion: 'Please try again with a specific date or contact an administrator for assistance.'
            };
          }
          
          console.log(`[DEBUG-BOOKING] Final date to use: ${formattedDate}`);
          
          // Check if the slot is in the past
          const slotDate = new Date(formattedDate);
          const now = new Date();
          if (slotDate < now) {
            return { error: 'Cannot book a slot in the past' };
          }
          
          // Get the user's employee record
          const employees = await EmployeeModel.getAllEmployees();
          const userEmployee = employees.find(emp => 
            emp.user_id === context.user.id || 
            emp.user_id === context.user.user_id || 
            emp.email === context.user.email
          );
          
          if (!userEmployee) {
            return { error: 'You do not have an employee profile. Please contact an administrator.' };
          }
          
          // Check for time conflicts using the proper conflict detection method
          const hasConflict = await ScheduleModel.checkScheduleConflict(
            userEmployee.id,
            formattedDate,
            selectedSlot.start_time,
            selectedSlot.end_time
          );
          
          if (hasConflict) {
            // Get the conflicting schedule to show details
            const userSchedules = await ScheduleModel.getSchedules({ 
              employee_id: userEmployee.id,
              date: formattedDate
            });
            
            if (userSchedules && userSchedules.length > 0) {
              const existingSchedule = userSchedules.find(schedule => 
                // Check for actual time overlap
                selectedSlot.start_time < schedule.end_time && 
                selectedSlot.end_time > schedule.start_time
              );
              
              if (existingSchedule) {
                return { 
                  error: `You already have a booking for ${formattedDate} from ${existingSchedule.start_time.substring(0, 5)} to ${existingSchedule.end_time.substring(0, 5)} that conflicts with this time slot. Please choose a non-overlapping time.`,
                  existingBooking: {
                    date: formattedDate,
                    time: `${existingSchedule.start_time.substring(0, 5)} - ${existingSchedule.end_time.substring(0, 5)}`,
                    status: existingSchedule.status
                  }
                };
              }
            }
            
            // Generic conflict message if we can't find the specific conflict
            return { 
              error: `You have a booking that conflicts with this time slot on ${formattedDate}.`,
              suggestion: 'Please choose a different time slot.'
            };
          }
          
          // Submit the schedule request
          const scheduleData = {
            employee_id: userEmployee.id,
            date: formattedDate,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            status: 'pending',
            notes: notes || `Booked via EnvoyAI for ${selectedSlot.name || selectedSlot.start_time}`,
            requested_by: context.user.id || context.user.user_id,
            time_slot_id: selectedSlot.id
          };
          
          console.log(`[DEBUG-BOOKING] AI final schedule data:`, JSON.stringify(scheduleData, null, 2));
          
          try {
            console.log(`[DEBUG-BOOKING] Calling ScheduleModel.requestSchedule`);
            const schedule = await ScheduleModel.requestSchedule(scheduleData);
            
            console.log(`[DEBUG-BOOKING] Schedule creation result:`, JSON.stringify(schedule, null, 2));
            
            if (schedule) {
              console.log(`[DEBUG-BOOKING] Booking successful, returning success response`);
              return { 
                success: true, 
                message: 'Time slot booked successfully! Your booking is pending approval.',
                details: {
                  date: formattedDate,
                  time: `${selectedSlot.start_time.substring(0, 5)} - ${selectedSlot.end_time.substring(0, 5)}`,
                  name: selectedSlot.name || '',
                  status: 'pending'
                }
              };
            } else {
              console.log(`[DEBUG-BOOKING] Schedule creation returned falsy value`);
              return { error: 'Failed to book the time slot. Please try again later.' };
            }
          } catch (bookingError) {
            console.error('[DEBUG-BOOKING] Error in booking process:', bookingError);
            
            // Check for specific error messages and provide user-friendly responses
            if (bookingError.message && bookingError.message.includes('conflicts')) {
              console.log(`[DEBUG-BOOKING] Conflict detected: ${bookingError.message}`);
              return { 
                error: `Scheduling conflict detected: You already have a booking that overlaps with this time slot on ${formattedDate}. Please check your existing schedules.`,
                suggestion: 'Try booking a different time slot or time period.'
              };
            }
            
            return { 
              error: bookingError.message || 'Error booking time slot',
              suggestion: 'Please try again later or contact an administrator for assistance.'
            };
          }
        } catch (error) {
          console.error('[DEBUG-BOOKING] Unexpected error in bookTimeSlot:', error);
          return { 
            error: error.message || 'Error booking time slot',
            suggestion: 'Please try again later or contact an administrator for assistance.'
          };
        }
      },
      approveSchedule: async ({ scheduleId } = {}, context = {}) => {
        try {
          // Check if user is admin
          if (context.user?.role !== 'admin') {
            return { error: 'This function is only available to administrators' };
          }
          
          if (!scheduleId) {
            return { error: 'Schedule ID is required' };
          }
          
          console.log(`Attempting to approve schedule with ID: ${scheduleId}`);
          
          // Use the dedicated approveSchedule method instead of updateSchedule
          const approvedSchedule = await ScheduleModel.approveSchedule(
            scheduleId, 
            context.user.id || context.user.user_id
          );
          
          if (approvedSchedule) {
            return { 
              success: true, 
              message: 'Schedule approved successfully!',
              details: {
                id: scheduleId,
                status: 'approved',
                date: approvedSchedule.date,
                time: `${approvedSchedule.start_time.substring(0, 5)} - ${approvedSchedule.end_time.substring(0, 5)}`
              }
            };
          } else {
            return { error: 'Failed to approve the schedule. Please try again later.' };
          }
        } catch (error) {
          console.error('Error approving schedule:', error);
          return { 
            error: error.message || 'Error approving schedule',
            suggestion: 'Please try again later or contact an administrator for assistance.'
          };
        }
      },
      rejectSchedule: async ({ scheduleId, reason = 'Rejected via EnvoyAI' } = {}, context = {}) => {
        try {
          // Check if user is admin
          if (context.user?.role !== 'admin') {
            return { error: 'This function is only available to administrators' };
          }
          
          if (!scheduleId) {
            return { error: 'Schedule ID is required' };
          }
          
          console.log(`Attempting to reject schedule with ID: ${scheduleId}`);
          
          // Use the dedicated rejectSchedule method instead of updateSchedule
          const rejectedSchedule = await ScheduleModel.rejectSchedule(
            scheduleId,
            context.user.id || context.user.user_id,
            reason
          );
          
          if (rejectedSchedule) {
            return { 
              success: true, 
              message: 'Schedule rejected successfully!',
              details: {
                id: scheduleId,
                status: 'rejected',
                date: rejectedSchedule.date,
                time: `${rejectedSchedule.start_time.substring(0, 5)} - ${rejectedSchedule.end_time.substring(0, 5)}`,
                reason: reason
              }
            };
          } else {
            return { error: 'Failed to reject the schedule. Please try again later.' };
          }
        } catch (error) {
          console.error('Error rejecting schedule:', error);
          return { 
            error: error.message || 'Error rejecting schedule',
            suggestion: 'Please try again later or contact an administrator for assistance.'
          };
        }
      }
    };
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
   * Process a natural language message with OpenAI
   * 
   * @param {string} message - The user's message
   * @param {Object} user - The current user
   * @returns {Promise<Object>} - The AI response
   */
  async processMessage(message, user) {
    try {
      // Initialize chat history for this user if it doesn't exist
      if (!this.cache.chatHistory[user.id]) {
        // Add user info as the first message in history
        this.cache.chatHistory[user.id] = [{
          role: "system",
          content: "User information",
          userInfo: {
            id: user.id || user.user_id,
            email: user.email,
            role: user.role,
            name: user.name
          }
        }];
      }
      
      // Add the user message to history
      this.cache.chatHistory[user.id].push({
        role: "user",
        content: message
      });
      
      // Limit history to last 10 messages to prevent token overflow
      // But always keep the first message with user info
      if (this.cache.chatHistory[user.id].length > 11) {
        const userInfo = this.cache.chatHistory[user.id][0];
        this.cache.chatHistory[user.id] = [
          userInfo,
          ...this.cache.chatHistory[user.id].slice(-10)
        ];
      }
      
      // Create a context object with user information
      const context = {
        user,
        currentDate: new Date().toISOString(),
        isAdmin: user.role === 'admin'
      };
      
      // Create wrapped tools that automatically include context
      const wrappedTools = {};
      Object.entries(this.aiTools).forEach(([name, func]) => {
        wrappedTools[name] = async (args = {}) => {
          return await func(args, context);
        };
      });
      
      // Process with OpenAI
      const aiResponse = await OpenAIService.processMessage(
        message,
        this.cache.chatHistory[user.id],
        wrappedTools
      );
      
      // Add the assistant's response to history
      this.cache.chatHistory[user.id].push({
        role: "assistant",
        content: aiResponse.content
      });
      
      return {
        response: aiResponse.content,
        functionCalls: aiResponse.functionCalls
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I'm sorry, I encountered an error processing your message. Please try again later.",
        error: error.message
      };
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
    
    // Check if we have cached pending requests
    if (!this.cache.pendingRequests || !this.cache.timestamps.pendingRequests) {
      return 'Please run /pending first to view pending requests.';
    }
    
    // Check if the cache is expired (5 minutes)
    const cacheAge = Date.now() - this.cache.timestamps.pendingRequests;
    if (cacheAge > 5 * 60 * 1000) {
      return 'Your pending request list has expired. Please run /pending again to refresh.';
    }
    
    if (!args || args.length === 0) {
      return 'Please specify which request(s) to approve by number, e.g., /approve 1,3 or /approve all';
    }
    
    const requestsToApprove = [];
    
    // Handle 'all' keyword
    if (args[0].toLowerCase() === 'all') {
      for (let i = 0; i < this.cache.pendingRequests.length; i++) {
        requestsToApprove.push(i + 1);
      }
    } else {
      // Parse comma-separated list of numbers
      const requestNums = args[0].split(',').map(num => parseInt(num.trim(), 10));
      
      // Validate each number
      for (const num of requestNums) {
        if (isNaN(num)) {
          return `Invalid request number: ${num}`;
        }
        
        if (num < 1 || num > this.cache.pendingRequests.length) {
          return `Request number ${num} is out of range. Valid range: 1-${this.cache.pendingRequests.length}`;
        }
        
        requestsToApprove.push(num);
      }
    }
    
    // Process approvals
    const approvalResults = [];
    
    for (const requestNum of requestsToApprove) {
      const requestId = this.cache.pendingRequests[requestNum - 1].id;
      
      try {
        // Use the dedicated approveSchedule method instead of updateSchedule
        const approvedSchedule = await ScheduleModel.approveSchedule(
          requestId, 
          user.id || user.user_id
        );
        
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
          // Use the dedicated rejectSchedule method instead of updateSchedule
          const rejectedSchedule = await ScheduleModel.rejectSchedule(
            requestId,
            user.id || user.user_id,
            rejectionReason
          );
          
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
      console.log(`[DEBUG] Command handleBook called with:
        - args: ${JSON.stringify(args || [])}
        - user: ${JSON.stringify(user || {})}
      `);
      
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
      console.log(`[DEBUG] Command selected slot:`, JSON.stringify(selectedSlot, null, 2));
      
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
      
      console.log(`[DEBUG] Command final schedule data:`, JSON.stringify(scheduleData, null, 2));
      
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

  /**
   * Clear the chat history for a specific user
   * 
   * @param {Object} user - The user object
   * @returns {boolean} - Success status
   */
  clearChatHistory(user) {
    try {
      if (!user || !user.id) {
        return false;
      }
      
      // Check if the user has any chat history
      if (this.cache.chatHistory[user.id]) {
        // Get the user info message (first message)
        const userInfo = this.cache.chatHistory[user.id][0];
        
        // Reset the chat history with just the user info
        this.cache.chatHistory[user.id] = [userInfo];
      } else {
        // Initialize with user info if no history exists
        this.cache.chatHistory[user.id] = [{
          role: "system",
          content: "User information",
          userInfo: {
            id: user.id || user.user_id,
            email: user.email,
            role: user.role,
            name: user.name
          }
        }];
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return false;
    }
  }
}

module.exports = new ChatService();
