import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ChatPopup.css';

const ChatPopup = () => {
  const { currentUser, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Welcome to ERS Assistant! Type /help to see available commands.', sender: 'system' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
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
          const response = await axios.get('/schedules/pending');
          const pendingSchedules = response.data.data;
          
          if (!pendingSchedules || pendingSchedules.length === 0) {
            return 'No pending schedule requests.';
          }
          
          return `Pending Schedule Requests (${pendingSchedules.length}):\n${pendingSchedules.map(sched => {
            const date = new Date(sched.date).toLocaleDateString();
            const empName = sched.employee?.name || 'Unknown';
            return `- ${empName} on ${date}: ${sched.start_time} to ${sched.end_time}`;
          }).join('\n')}`;
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
            notes: 'Requested via chat interface',
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
      description: 'Approve a pending request (Admin only) (format: /approve [request_id])',
      isAdmin: true,
      handler: async (args) => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        if (!args || args.length < 1) {
          return 'Please provide the request ID to approve.';
        }
        
        const requestId = args[0];
        
        try {
          const response = await axios.patch(`/schedules/${requestId}/approve`, {
            approved_by: currentUser.id
          });
          
          if (response.data.success) {
            return `Request #${requestId} has been approved successfully.`;
          } else {
            return 'Failed to approve request. Please try again later.';
          }
        } catch (error) {
          console.error('Error approving request:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error approving request. Please try again later.';
        }
      }
    },
    reject: {
      description: 'Reject a pending request (Admin only) (format: /reject [request_id] [reason])',
      isAdmin: true,
      handler: async (args) => {
        if (!isAdmin) {
          return 'This command is only available to administrators.';
        }
        
        if (!args || args.length < 1) {
          return 'Please provide the request ID and optional reason to reject.';
        }
        
        const requestId = args[0];
        const reason = args.slice(1).join(' ') || 'Rejected via chat interface';
        
        try {
          const response = await axios.patch(`/schedules/${requestId}/reject`, {
            approved_by: currentUser.id,
            rejection_reason: reason
          });
          
          if (response.data.success) {
            return `Request #${requestId} has been rejected.`;
          } else {
            return 'Failed to reject request. Please try again later.';
          }
        } catch (error) {
          console.error('Error rejecting request:', error);
          
          if (error.response && error.response.data && error.response.data.message) {
            return `Error: ${error.response.data.message}`;
          }
          
          return 'Error rejecting request. Please try again later.';
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

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

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
      const loadingMessageId = messages.length + 1;
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

  return (
    <div className="chat-container">
      <button 
        className={`chat-button ${isOpen ? 'open' : ''}`} 
        onClick={toggleChat}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment'}`}></i>
      </button>
      
      {isOpen && (
        <div className="chat-popup">
          <div className="chat-header">
            <h3>ERS Assistant</h3>
          </div>
          
          <div className="chat-messages">
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
          
          <form className="chat-input-form" onSubmit={handleSubmit}>
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
      )}
    </div>
  );
};

export default ChatPopup; 