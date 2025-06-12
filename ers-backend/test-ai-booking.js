// Test script to demonstrate the structured approach for the AI booking system
require('dotenv').config();

const OpenAIService = require('./src/services/chat/OpenAIService');
const EmployeeModel = require('./src/models/employee');
const ScheduleModel = require('./src/models/schedule');
const TimeSlotModel = require('./src/models/timeSlot');

// Mock tools for testing
const mockTools = {
  getAllEmployees: async () => {
    console.log('Tool called: getAllEmployees');
    return [
      { id: '1', name: 'John Doe', position: 'Developer', email: 'john@example.com', department_id: '1' },
      { id: '2', name: 'Jane Smith', position: 'Manager', email: 'jane@example.com', department_id: '2' }
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
      },
      {
        id: "c95a3acb-408c-413e-b890-bced085ed37f",
        dayName: "Saturday",
        date: "6/7/2025",
        time: "10:00 - 13:00",
        name: "Dupur",
        availableSpots: 5,
        isPast: false
      }
    ];
  },
  bookTimeSlot: async ({ slotId, date, notes }) => {
    console.log(`Tool called: bookTimeSlot with slotId: ${slotId}, date: ${date}, notes: ${notes}`);
    
    if (slotId === "c95a3acb-408c-413e-b890-bced085ed37f") {
      return {
        success: true,
        message: 'Time slot booked successfully! Your booking is pending approval.',
        details: {
          date: "2025-06-07",
          time: "10:00 - 13:00",
          name: "Dupur",
          status: 'pending'
        }
      };
    } else {
      return { 
        error: 'Invalid slot ID. Please use a valid slot ID from the available slots list.',
        suggestion: 'Try booking a different time slot.'
      };
    }
  },
  getUserSchedules: async () => {
    console.log('Tool called: getUserSchedules');
    return []; // No existing schedules
  }
};

// Mock user for testing
const mockUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'employee'
};

// Test function
async function runTest() {
  console.log('=== TESTING AI BOOKING SYSTEM WITH STRUCTURED APPROACH ===');
  
  // Initialize chat history with user info
  const chatHistory = [{
    role: "system",
    content: "User information",
    userInfo: mockUser
  }];
  
  try {
    // Test scenario 1: Show available slots
    console.log('\n=== TEST SCENARIO 1: SHOW AVAILABLE SLOTS ===');
    const response1 = await OpenAIService.processMessage(
      "Show me available slots for this week",
      chatHistory,
      mockTools
    );
    
    // Add the user message and AI response to history
    chatHistory.push({
      role: "user",
      content: "Show me available slots for this week"
    });
    chatHistory.push({
      role: "assistant",
      content: response1.content
    });
    
    console.log('\nAI Response:');
    console.log(response1.content);
    
    // Test scenario 2: Book a slot
    console.log('\n=== TEST SCENARIO 2: BOOK A SLOT ===');
    const response2 = await OpenAIService.processMessage(
      "Book the Saturday slot for me",
      chatHistory,
      mockTools
    );
    
    // Add the user message and AI response to history
    chatHistory.push({
      role: "user",
      content: "Book the Saturday slot for me"
    });
    chatHistory.push({
      role: "assistant",
      content: response2.content
    });
    
    console.log('\nAI Response:');
    console.log(response2.content);
    
    // Test scenario 3: Check bookings
    console.log('\n=== TEST SCENARIO 3: CHECK BOOKINGS ===');
    const response3 = await OpenAIService.processMessage(
      "What bookings do I have?",
      chatHistory,
      mockTools
    );
    
    console.log('\nAI Response:');
    console.log(response3.content);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest().then(() => {
  console.log('\nTest completed successfully!');
}).catch(err => {
  console.error('Test failed with error:', err);
}); 