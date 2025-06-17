// Test script to demonstrate admin booking capabilities in the AI assistant
require('dotenv').config();

const OpenAIService = require('./src/services/chat/OpenAIService');
const ChatService = require('./src/services/chat/ChatService');

// Set up debug logging
process.env.DEBUG_AI_LOGS = 'true';

// Mock tools for testing
const mockTools = {
  getAllEmployees: async () => {
    console.log('Tool called: getAllEmployees');
    return [
      { id: '1', name: 'John Doe', position: 'Developer', email: 'john@example.com', department_id: '1', user_id: '101' },
      { id: '2', name: 'Jane Smith', position: 'Manager', email: 'jane@example.com', department_id: '2', user_id: '102' }
    ];
  },
  getAvailableTimeSlots: async () => {
    console.log('Tool called: getAvailableTimeSlots');
    return [
      {
        id: "c18739f9-946d-4c1e-bb04-6d44d48548ca",
        dayName: "Thursday",
        date: "6/5/2025",
        time: "09:00 - 17:00",
        name: "Business Hours - Office Admin",
        availableSpots: "unlimited",
        isPast: false
      },
      {
        id: "435cd4f1-0bb6-4428-b07e-22c0a9432b13",
        dayName: "Friday",
        date: "6/6/2025",
        time: "10:00 - 13:00",
        name: "Morning",
        availableSpots: 5,
        isPast: false
      }
    ];
  },
  bookTimeSlot: async (params, context) => {
    console.log('Tool called: bookTimeSlot with params:', JSON.stringify(params, null, 2));
    console.log('Context user:', JSON.stringify(context?.user, null, 2));
    
    // For testing, just return a success response
    if (params.employeeId || params.employeeName) {
      return {
        success: true,
        message: `Successfully booked time slot for ${params.employeeName || 'employee ID ' + params.employeeId}. Status: auto-approved`,
        details: {
          date: "2025-06-06",
          time: "10:00 - 13:00",
          employee: params.employeeName || 'Employee',
          status: 'approved'
        }
      };
    } else {
      const isAdmin = context?.user?.role === 'admin';
      return {
        success: true,
        message: `Successfully booked time slot. Status: ${isAdmin ? 'auto-approved' : 'pending approval'}`,
        details: {
          date: "2025-06-05",
          time: "09:00 - 17:00",
          employee: context?.user?.name || 'User',
          status: isAdmin ? 'approved' : 'pending'
        }
      };
    }
  },
  getUserSchedules: async () => {
    console.log('Tool called: getUserSchedules');
    return []; // No existing schedules
  }
};

// Mock users for testing
const mockAdminUser = {
  id: '123',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin'
};

const mockRegularUser = {
  id: '124',
  name: 'Regular User',
  email: 'user@example.com',
  role: 'employee'
};

// Test function
async function runTest() {
  console.log('=== TESTING ADMIN BOOKING CAPABILITIES IN AI ASSISTANT ===');
  
  // Test 1: Admin booking for themselves
  console.log('\n=== TEST 1: ADMIN BOOKING FOR THEMSELVES ===');
  
  // Initialize chat history with admin user info
  const adminChatHistory = [{
    role: "system",
    content: "User information",
    userInfo: mockAdminUser
  }];
  
  try {
    // First, show available slots
    console.log('Requesting available slots...');
    const response1 = await OpenAIService.processMessage(
      "Show me available slots for this week",
      adminChatHistory,
      {
        ...mockTools,
        context: { user: mockAdminUser }
      }
    );
    
    console.log('\nAI Response (Show slots):');
    console.log(response1.content || response1);
    
    // Add the user message and AI response to history
    adminChatHistory.push({
      role: "user",
      content: "Show me available slots for this week"
    });
    
    if (response1.content) {
      adminChatHistory.push({
        role: "assistant",
        content: response1.content
      });
    }
    
    // Book a slot as admin for themselves
    console.log('\nBooking slot as admin for themselves...');
    const response2 = await OpenAIService.processMessage(
      "Book slot 1 for myself",
      adminChatHistory,
      {
        ...mockTools,
        context: { user: mockAdminUser }
      }
    );
    
    console.log('\nAI Response (Admin booking for self):');
    console.log(response2.content || response2);
  } catch (error) {
    console.error('Test 1 failed:', error);
  }
  
  // Test 2: Admin booking for another employee
  console.log('\n=== TEST 2: ADMIN BOOKING FOR ANOTHER EMPLOYEE ===');
  
  // Initialize chat history with admin user info
  const adminChatHistory2 = [{
    role: "system",
    content: "User information",
    userInfo: mockAdminUser
  }];
  
  try {
    // First, show available slots
    console.log('Requesting available slots...');
    const response1 = await OpenAIService.processMessage(
      "Show me available slots for this week",
      adminChatHistory2,
      {
        ...mockTools,
        context: { user: mockAdminUser }
      }
    );
    
    console.log('\nAI Response (Show slots):');
    console.log(response1.content || response1);
    
    // Add the user message and AI response to history
    adminChatHistory2.push({
      role: "user",
      content: "Show me available slots for this week"
    });
    
    if (response1.content) {
      adminChatHistory2.push({
        role: "assistant",
        content: response1.content
      });
    }
    
    // Book a slot as admin for another employee
    console.log('\nBooking slot as admin for another employee...');
    const response2 = await OpenAIService.processMessage(
      "Book slot 2 for Jane Smith",
      adminChatHistory2,
      {
        ...mockTools,
        context: { user: mockAdminUser }
      }
    );
    
    console.log('\nAI Response (Admin booking for another employee):');
    console.log(response2.content || response2);
  } catch (error) {
    console.error('Test 2 failed:', error);
  }
  
  // Test 3: Regular user booking (should require approval)
  console.log('\n=== TEST 3: REGULAR USER BOOKING (SHOULD REQUIRE APPROVAL) ===');
  
  // Initialize chat history with regular user info
  const regularUserChatHistory = [{
    role: "system",
    content: "User information",
    userInfo: mockRegularUser
  }];
  
  try {
    // First, show available slots
    console.log('Requesting available slots...');
    const response1 = await OpenAIService.processMessage(
      "Show me available slots for this week",
      regularUserChatHistory,
      {
        ...mockTools,
        context: { user: mockRegularUser }
      }
    );
    
    console.log('\nAI Response (Show slots):');
    console.log(response1.content || response1);
    
    // Add the user message and AI response to history
    regularUserChatHistory.push({
      role: "user",
      content: "Show me available slots for this week"
    });
    
    if (response1.content) {
      regularUserChatHistory.push({
        role: "assistant",
        content: response1.content
      });
    }
    
    // Book a slot as regular user
    console.log('\nBooking slot as regular user...');
    const response2 = await OpenAIService.processMessage(
      "Book slot 1",
      regularUserChatHistory,
      {
        ...mockTools,
        context: { user: mockRegularUser }
      }
    );
    
    console.log('\nAI Response (Regular user booking):');
    console.log(response2.content || response2);
  } catch (error) {
    console.error('Test 3 failed:', error);
  }
}

// Run the test
runTest().then(() => {
  console.log('\nTest completed successfully!');
}).catch(err => {
  console.error('Test failed with error:', err);
}); 