import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './EnvoyAI.css';

const EnvoyAI = () => {
  const { currentUser, isAdmin } = useAuth();
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to EnvoyAI! Type /help to see available commands or click on a suggested command below.', sender: 'system' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Add state variables to store available slots after fetching
  const [availableSlotsCache, setAvailableSlotsCache] = useState([]);
  const [slotsCacheTimestamp, setSlotsCacheTimestamp] = useState(null);
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  
  // Add state variables to store pending requests
  const [pendingRequestsCache, setPendingRequestsCache] = useState([]);
  const [pendingCacheTimestamp, setPendingCacheTimestamp] = useState(null);
  
  // Common command suggestions to display
  const commonCommands = [
    { text: '/help', description: 'Show all commands' },
    { text: '/profile', description: 'View your profile' },
    { text: '/schedules', description: 'View your schedules' },
    { text: '/employees', description: 'List all employees' },
    { text: '/departments', description: 'List all departments' },
    { text: '/slots', description: 'View available slots this week' },
    { text: '/book', description: 'Book a slot by number' }
  ];
  
  // Admin-only command suggestions
  const adminCommands = [
    { text: '/pending', description: 'Show pending requests' },
    { text: '/approve', description: 'Approve requests by number' },
    { text: '/reject', description: 'Reject requests by number' },
    { text: '/users', description: 'List all users' },
    { text: '/stats', description: 'System statistics' }
  ];

  // Available commands
  const commands = {
    help: {
      description: 'Show available commands',
      isAdmin: false,
      handler: () => {
        const commandList = Object.keys(commands)
          .filter(cmd => !commands[cmd].isAdmin || isAdmin)
          .map(cmd => `/${cmd} - ${commands[cmd].description}`)
          .join('\n');
        
        return `Available commands:\n${commandList}`;
      }
    },
    profile: {
      description: 'View your profile information',
      isAdmin: false,
      handler: () => {
        if (!currentUser) return 'You are not logged in.';
        
        return `Profile Information:
Name: ${currentUser.name || 'Not set'}
Email: ${currentUser.email}
Role: ${currentUser.role}`;
      }
    },
    employees: {
      description: 'List all employees',
      isAdmin: false,
      handler: async () => {
        try {
          const response = await axios.get('/employees');
          const employees = response.data.data;
          
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
    },
    departments: {
      description: 'List all departments',
      isAdmin: false,
      handler: async () => {
        try {
          const response = await axios.get('/departments');
          const departments = response.data.data;
          
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
    },
    schedules: {
      description: 'View your upcoming schedules',
      isAdmin: false,
      handler: async () => {
        try {
          // First get the user's employee record
          const empResponse = await axios.get('/employees');
          const employees = empResponse.data.data;
          const userEmployee = employees.find(emp => 
            emp.email === currentUser.email
          );
          
          if (!userEmployee) {
            return 'You do not have an employee profile.';
          }
          
          // Now get the schedules
          const schedResponse = await axios.get(`/schedules?employee_id=${userEmployee.id}`);
          const schedules = schedResponse.data.data;
          
          if (!schedules || schedules.length === 0) {
            return 'No upcoming schedules found.';
          }
          
          return `Your Upcoming Schedules:\n${schedules
            .filter(sched => new Date(sched.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
            .map(sched => {
              const date = new Date(sched.date).toLocaleDateString();
              return `- ${date}: ${sched.start_time} to ${sched.end_time}`;
            }).join('\n')}`;
        } catch (error) {
          console.error('Error fetching schedules:', error);
          return 'Error fetching schedules.';
        }
      }
    },
    pending: {
      description: 'Show pending schedule requests (Admin only)',
      isAdmin: true,
      handler: async () => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        try {
          // Fetch schedules with pending status instead of using the /pending endpoint
          const response = await axios.get('/schedules', {
            params: { status: 'pending' }
          });
          
          const pendingSchedules = response.data.data;
          
          if (!pendingSchedules || pendingSchedules.length === 0) {
            return 'No pending schedule requests.';
          }
          
          // Cache the pending requests for the approve command
          setPendingRequestsCache(pendingSchedules);
          setPendingCacheTimestamp(Date.now());
          
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
    },
    users: {
      description: 'List all users (Admin only)',
      isAdmin: true,
      handler: async () => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        try {
          const response = await axios.get('/auth/users');
          const users = response.data.data;
          
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
    },
    stats: {
      description: 'Show system statistics',
      isAdmin: true,
      handler: async () => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        try {
          const empResponse = await axios.get('/employees');
          const deptResponse = await axios.get('/departments');
          const userResponse = await axios.get('/auth/users');
          
          const employees = empResponse.data.data;
          const departments = deptResponse.data.data;
          const users = userResponse.data.data;
          
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
    },
    deptemployees: {
      description: 'View employees in a specific department',
      isAdmin: false,
      handler: async () => {
        try {
          // Get departments first
          const deptResponse = await axios.get('/departments');
          const departments = deptResponse.data.data;
          
          if (!departments || departments.length === 0) {
            return 'No departments available.';
          }
          
          // Get all employees
          const empResponse = await axios.get('/employees');
          const employees = empResponse.data.data;
          
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
    },
    request: {
      description: 'Request time off (format: /request YYYY-MM-DD HH:MM HH:MM)',
      isAdmin: false,
      handler: async (args) => {
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
          const empResponse = await axios.get('/employees');
          const employees = empResponse.data.data;
          const userEmployee = employees.find(emp => 
            emp.email === currentUser.email
          );
          
          if (!userEmployee) {
            return 'You do not have an employee profile. Please contact an administrator.';
          }
          
          // Submit the schedule request
          const response = await axios.post('/schedules', {
            employee_id: userEmployee.id,
            date,
            start_time: startTime,
            end_time: endTime,
            status: 'pending',
            notes: 'Requested via EnvoyAI',
            requested_by: currentUser.id
          });
          
          if (response.data.success) {
            return 'Time off request submitted successfully! Your request is pending approval.';
          } else {
            return 'Failed to submit time off request. Please try again later.';
          }
        } catch (error) {
          console.error('Error submitting time off request:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error submitting time off request. Please try again later.';
        }
      }
    },
    approve: {
      description: 'Approve pending requests by number (format: /approve [number1,number2,...] or /approve all)',
      isAdmin: true,
      handler: async (args) => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        if (!args || args.length < 1) {
          return 'Please provide the request number(s) to approve (e.g., /approve 1,3) or /approve all to approve all requests.';
        }
        
        // Check if cache is expired
        if (!pendingCacheTimestamp || Date.now() - pendingCacheTimestamp > CACHE_EXPIRY_MS) {
          return 'Please run /pending first to see pending requests before approving.';
        }
        
        if (pendingRequestsCache.length === 0) {
          return 'There are no pending requests to approve.';
        }
        
        try {
          let requestsToApprove = [];
          
          // Handle "all" option
          if (args[0].toLowerCase() === 'all') {
            requestsToApprove = pendingRequestsCache.map((_, index) => index + 1);
          } else {
            // Parse comma-separated numbers
            const requestNumbers = args[0].split(',').map(num => parseInt(num.trim()));
            
            // Validate all numbers
            for (const num of requestNumbers) {
              if (isNaN(num) || num < 1 || num > pendingRequestsCache.length) {
                return `Invalid request number: ${num}. Please choose numbers between 1 and ${pendingRequestsCache.length}.`;
              }
            }
            
            requestsToApprove = requestNumbers;
          }
          
          // Approve each request
          const approvalResults = [];
          
          for (const requestNum of requestsToApprove) {
            const requestId = pendingRequestsCache[requestNum - 1].id;
            
            try {
              const response = await axios.patch(`/schedules/${requestId}/approve`, {
                approved_by: currentUser.id
              });
              
              if (response.data.success) {
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
                message: error.response?.data?.message || 'Request failed' 
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
          setPendingCacheTimestamp(null);
          
          return resultMessage;
        } catch (error) {
          console.error('Error approving requests:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error approving requests. Please try again later.';
        }
      }
    },
    reject: {
      description: 'Reject pending requests by number (format: /reject [number1,number2,...] reason or /reject all reason)',
      isAdmin: true,
      handler: async (args) => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        if (!args || args.length < 1) {
          return 'Please provide the request number(s) to reject and an optional reason (e.g., /reject 1,3 schedule conflict).';
        }
        
        // Check if cache is expired
        if (!pendingCacheTimestamp || Date.now() - pendingCacheTimestamp > CACHE_EXPIRY_MS) {
          return 'Please run /pending first to see pending requests before rejecting.';
        }
        
        if (pendingRequestsCache.length === 0) {
          return 'There are no pending requests to reject.';
        }
        
        try {
          let requestsToReject = [];
          let rejectionReason = "Rejected via EnvoyAI";
          
          // Handle "all" option
          if (args[0].toLowerCase() === 'all') {
            requestsToReject = pendingRequestsCache.map((_, index) => index + 1);
            rejectionReason = args.slice(1).join(' ') || rejectionReason;
          } else {
            // Check if first argument is comma-separated numbers
            const firstArg = args[0];
            if (/^[\d,]+$/.test(firstArg)) {
              // Parse comma-separated numbers
              const requestNumbers = firstArg.split(',').map(num => parseInt(num.trim()));
              
              // Validate all numbers
              for (const num of requestNumbers) {
                if (isNaN(num) || num < 1 || num > pendingRequestsCache.length) {
                  return `Invalid request number: ${num}. Please choose numbers between 1 and ${pendingRequestsCache.length}.`;
                }
              }
              
              requestsToReject = requestNumbers;
              rejectionReason = args.slice(1).join(' ') || rejectionReason;
            } else {
              // Single number followed by reason
              const requestNum = parseInt(args[0]);
              if (isNaN(requestNum) || requestNum < 1 || requestNum > pendingRequestsCache.length) {
                return `Invalid request number: ${args[0]}. Please choose a number between 1 and ${pendingRequestsCache.length}.`;
              }
              
              requestsToReject = [requestNum];
              rejectionReason = args.slice(1).join(' ') || rejectionReason;
            }
          }
          
          // Reject each request
          const rejectionResults = [];
          
          for (const requestNum of requestsToReject) {
            const requestId = pendingRequestsCache[requestNum - 1].id;
            
            try {
              const response = await axios.patch(`/schedules/${requestId}/reject`, {
                approved_by: currentUser.id,
                rejection_reason: rejectionReason
              });
              
              if (response.data.success) {
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
                message: error.response?.data?.message || 'Request failed' 
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
          setPendingCacheTimestamp(null);
          
          return resultMessage;
        } catch (error) {
          console.error('Error rejecting requests:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error rejecting requests. Please try again later.';
        }
      }
    },
    slots: {
      description: 'View available slots for this week',
      isAdmin: false,
      handler: async () => {
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
          const slotsResponse = await axios.get('/time-slots');
          const allTimeSlots = slotsResponse.data.data;
          
          if (!allTimeSlots || allTimeSlots.length === 0) {
            return 'No time slots found.';
          }
          
          // Check availability for each time slot for this week
          const availabilityPromises = allTimeSlots.map(slot => 
            axios.get(`/time-slots/${slot.id}/availability?week_start_date=${formattedDate}`)
          );
          
          const availabilityResults = await Promise.all(availabilityPromises);
          
          // Process results to show available slots
          const availableSlots = allTimeSlots.map((slot, index) => {
            const availability = availabilityResults[index].data.data;
            
            // Map day numbers to names
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[slot.day_of_week];
            
            // Calculate the actual date for this day
            const slotDate = new Date(weekStartDate);
            slotDate.setDate(weekStartDate.getDate() + slot.day_of_week);
            const formattedSlotDate = slotDate.toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            });
            
            // Format time
            const startTime = slot.start_time.substring(0, 5);
            const endTime = slot.end_time.substring(0, 5);
            
            // Calculate available spots
            const maxEmployees = availability.max_employees || 'unlimited';
            const currentCount = availability.current_count || 0;
            const availableSpots = maxEmployees === 'unlimited' ? 'unlimited' : maxEmployees - currentCount;
            
            return {
              id: slot.id,
              dayName,
              dayNumber: slot.day_of_week,
              date: formattedSlotDate,
              dateObj: slotDate,
              time: `${startTime} - ${endTime}`,
              startTime,
              endTime,
              name: slot.name || '',
              availableSpots,
              rawDate: slotDate.toISOString().split('T')[0]
            };
          });
          
          // Sort by day of week
          availableSlots.sort((a, b) => a.dayNumber - b.dayNumber);
          
          // Cache the available slots for the book command to use
          setAvailableSlotsCache(availableSlots);
          setSlotsCacheTimestamp(Date.now());
          
          // Format the output with serial numbers
          const slotsOutput = availableSlots.map((slot, index) => {
            const spotText = slot.availableSpots === 'unlimited' ? 
              'unlimited spots' : 
              `${slot.availableSpots} spot${slot.availableSpots !== 1 ? 's' : ''} available`;
            
            return `${index + 1}. ${slot.dayName} (${slot.date}), ${slot.time} ${slot.name ? `(${slot.name})` : ''}: ${spotText}`;
          }).join('\n');
          
          return `Available Slots for Week of ${weekStartDate.toLocaleDateString()}:\n${slotsOutput}\n\nTo book a slot, type /book followed by the slot number (e.g. /book 3)`;
        } catch (error) {
          console.error('Error fetching available slots:', error);
          return 'Error fetching available slots.';
        }
      }
    },
    book: {
      description: 'Book a slot by its number (format: /book [slot_number])',
      isAdmin: false,
      handler: async (args) => {
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
          if (!slotsCacheTimestamp || Date.now() - slotsCacheTimestamp > CACHE_EXPIRY_MS) {
            return 'Please run /slots first to see available slots before booking.';
          }
          
          // Check if the slot number is valid
          if (slotNumber > availableSlotsCache.length) {
            return `Invalid slot number. Please choose a number between 1 and ${availableSlotsCache.length}.`;
          }
          
          // Get the selected slot
          const selectedSlot = availableSlotsCache[slotNumber - 1];
          
          // Check if the slot has available spots
          if (selectedSlot.availableSpots !== 'unlimited' && selectedSlot.availableSpots <= 0) {
            return `Sorry, slot ${slotNumber} has no available spots.`;
          }
          
          // First get the user's employee record
          const empResponse = await axios.get('/employees');
          const employees = empResponse.data.data;
          const userEmployee = employees.find(emp => 
            emp.email === currentUser.email
          );
          
          if (!userEmployee) {
            return 'You do not have an employee profile. Please contact an administrator.';
          }
          
          // Submit the schedule request
          const response = await axios.post('/schedules', {
            employee_id: userEmployee.id,
            date: selectedSlot.rawDate,
            start_time: selectedSlot.startTime,
            end_time: selectedSlot.endTime,
            status: 'pending',
            notes: `Booked via EnvoyAI for ${selectedSlot.name || selectedSlot.time}`,
            requested_by: currentUser.id
          });
          
          if (response.data.success) {
            return `Successfully booked slot ${slotNumber}: ${selectedSlot.dayName} (${selectedSlot.date}), ${selectedSlot.time}. Your booking is pending approval.`;
          } else {
            return 'Failed to book the slot. Please try again later.';
          }
        } catch (error) {
          console.error('Error booking slot:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error booking the slot. Please try again later.';
        }
      }
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const addMessage = (text, sender = 'user') => {
    const newMessage = {
      id: messages.length + 1,
      text,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  const processCommand = async (commandText) => {
    // Extract the command and arguments
    const parts = commandText.trim().split(' ');
    const command = parts[0].substring(1); // Remove the leading '/'
    const args = parts.slice(1);
    
    if (commands[command]) {
      if (commands[command].isAdmin && !isAdmin) {
        addMessage('This command is only available to administrators.', 'system');
        return;
      }
      
      // Add a loading message
      addMessage('Processing...', 'system');
      
      try {
        // Pass arguments to the handler if the command supports it
        const response = await commands[command].handler(args);
        
        // Remove the loading message
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.text !== 'Processing...')
        );
        
        // Add the response
        addMessage(response, 'system');
      } catch (error) {
        console.error(`Error processing command /${command}:`, error);
        
        // Remove the loading message
        setMessages(prevMessages => 
          prevMessages.filter(msg => msg.text !== 'Processing...')
        );
        
        addMessage('An error occurred while processing your command.', 'system');
      }
    } else {
      addMessage(`Unknown command: ${commandText}. Type /help to see available commands.`, 'system');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    const userInput = inputValue.trim();
    addMessage(userInput);
    setInputValue('');
    
    if (userInput.startsWith('/')) {
      await processCommand(userInput);
    } else {
      addMessage("I'm a command-based assistant. Please use commands starting with '/' (e.g., /help)", 'system');
    }
  };

  const handleCommandSuggestionClick = (command) => {
    setInputValue(command);
    inputRef.current.focus();
  };

  const handleHelpClick = () => {
    processCommand('/help');
  };

  return (
    <div className="envoyai-container">
      <div className="envoyai-chat">
        <div className="envoyai-messages">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender}`}
            >
              <div className="message-content">
                {message.text.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="command-suggestions">
          {commonCommands.map(cmd => (
            <div 
              key={cmd.text} 
              className="command-suggestion"
              onClick={() => handleCommandSuggestionClick(cmd.text)}
              title={cmd.description}
            >
              {cmd.text}
            </div>
          ))}
          
          {isAdmin && adminCommands.map(cmd => (
            <div 
              key={cmd.text} 
              className="command-suggestion"
              onClick={() => handleCommandSuggestionClick(cmd.text)}
              title={cmd.description}
            >
              {cmd.text}
            </div>
          ))}
        </div>
        
        <div className="help-button" onClick={handleHelpClick} title="Show available commands">
          /help
        </div>
        
        <form className="envoyai-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a command (e.g., /help)"
            ref={inputRef}
          />
          <button type="submit">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default EnvoyAI; 