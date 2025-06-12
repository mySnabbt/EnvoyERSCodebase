const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

// Helper function to log AI processing steps
function logAI(message, type = 'info') {
  // Only log if DEBUG_AI_LOGS is enabled
  if (process.env.DEBUG_AI_LOGS === 'true') {
    const prefix = type === 'start' ? '\n\n---------START AI----------' :
                  type === 'end' ? '----------END AI----------\n\n' :
                  '----------AI LOG----------';
    
    console.log(prefix);
    
    // If the message is an object, stringify it with nice formatting
    if (typeof message === 'object') {
      console.log(JSON.stringify(message, null, 2));
    } else {
      console.log(message);
    }
    
    if (type === 'start' || type === 'end') {
      console.log(prefix);
    }
  }
}

class OpenAIService {
  constructor() {
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('AI Debug Logs:', process.env.DEBUG_AI_LOGS === 'true' ? 'Enabled' : 'Disabled');
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process a user message through OpenAI with a simplified approach
   * 
   * @param {string} message - The user's message
   * @param {Array} history - Chat history
   * @param {Object} tools - Available tools/functions
   * @returns {Promise<Object>} - The AI response
   */
  async processMessage(message, history, tools) {
    try {
      // Extract user info from the latest message if available
      const userInfo = history.length > 0 && history[0].userInfo ? history[0].userInfo : null;
      
      // Prepare the system message with simplified approach instructions
      const systemMessage = {
        role: "system",
        content: `You are EnvoyAI, an AI assistant for the Employee System (ERS).
You can help users with information about employees, departments, schedules, and more.

CRITICAL INSTRUCTION: You must ONLY use actual data returned by the tools. NEVER make up or fabricate information.
If you don't have certain information, say so clearly rather than inventing details.

${userInfo ? `Current user: ${userInfo.name || userInfo.email} (${userInfo.role})` : ''}
${userInfo && userInfo.role === 'admin' ? 'This user is an administrator and has access to all functions.' : ''}
Current date: ${new Date().toLocaleDateString()}

RESPONSE FORMAT:
You must respond in JSON format with one of these types:
1. PLAN: When you need to think about how to address the user's request
2. ACTION: When you need to call a function to get data
3. OUTPUT: When you have all the information to respond directly to the user

Examples:
{ "type": "plan", "content": "I need to get employee information before responding." }
{ "type": "action", "function": "getAllEmployees", "arguments": {} }
{ "type": "output", "content": "Here are the employees in the system: [list from data]" }

IMPORTANT RULES:
- For simple greetings or general questions about your capabilities, use OUTPUT directly
- Only use ACTION when you need specific data from the system
- Always verify you have the necessary data before making statements
- For booking slots, ALWAYS call getAvailableTimeSlots first to get current valid UUIDs
- For approving schedules, ALWAYS call getPendingSchedules first to get current schedule IDs
- NEVER make up or modify UUIDs - always use exact IDs from function responses

COMMON BOOKING ERRORS:
- "Schedule conflicts with an existing time slot" - The user already has a booking that overlaps
- "You already have a booking that overlaps with this time slot" - Same as above`
      };

      // Define available functions
      const availableFunctions = {
        getAllEmployees: {
          description: "Get a list of all employees in the system",
          parameters: {}
        },
        getEmployeeById: {
          description: "Get detailed information about a specific employee by their ID",
          parameters: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The UUID of the employee"
              }
            },
            required: ["id"]
          }
        },
        getAllDepartments: {
          description: "Get a list of all departments in the organization",
          parameters: {}
        },
        getUserSchedules: {
          description: "Get the current user's schedules or a specific user's schedules",
          parameters: {
            type: "object",
            properties: {
              userId: {
                type: "string",
                description: "Optional: The UUID of the user. If not provided, the current user's ID will be used."
              }
            },
            required: []
          }
        },
        getPendingSchedules: {
          description: "Get all pending schedule requests (admin only function)",
          parameters: {}
        },
        getAvailableTimeSlots: {
          description: "Get available time slots for scheduling this week. ALWAYS call this function BEFORE attempting to book any slot to get the current valid UUIDs.",
          parameters: {}
        },
        bookTimeSlot: {
          description: "Book a time slot for the current user. MUST use an exact UUID from a previous getAvailableTimeSlots call.",
          parameters: {
            type: "object",
            properties: {
              slotId: {
                type: "string",
                description: "The exact UUID of the time slot to book, must be copied directly from getAvailableTimeSlots response. Do NOT modify or create UUIDs."
              },
              date: {
                type: "string",
                description: "Optional: The date to book in YYYY-MM-DD format. If not provided, the date will be calculated based on the slot's day of week."
              },
              notes: {
                type: "string",
                description: "Optional: Notes for the booking"
              }
            },
            required: ["slotId"]
          }
        },
        approveSchedule: {
          description: "Approve a pending schedule request (admin only function)",
          parameters: {
            type: "object",
            properties: {
              scheduleId: {
                type: "string",
                description: "The UUID of the schedule to approve. Get this from getPendingSchedules."
              }
            },
            required: ["scheduleId"]
          }
        },
        rejectSchedule: {
          description: "Reject a pending schedule request (admin only function)",
          parameters: {
            type: "object",
            properties: {
              scheduleId: {
                type: "string",
                description: "The UUID of the schedule to reject. Get this from getPendingSchedules."
              },
              reason: {
                type: "string",
                description: "Optional: The reason for rejecting the schedule request."
              }
            },
            required: ["scheduleId"]
          }
        }
      };

      // Prepare the messages array for OpenAI
      const messages = [
        systemMessage,
        ...history,
        { role: "user", content: message }
      ];

      // Log the start of AI processing
      logAI({
        type: "user_input",
        message: message,
        history_length: history.length,
        available_tools: Object.keys(tools)
      }, 'start');
      
      // Initialize conversation data
      let conversationData = {
        messages: [...messages],
        finalOutput: null,
        toolResults: []
      };
      
      // Process the conversation until we have a final output
      while (!conversationData.finalOutput) {
        // Create the completion request
        const response = await this.client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: conversationData.messages,
          response_format: { type: "json_object" },
          tools: Object.entries(availableFunctions).map(([name, def]) => ({
            type: "function",
            function: {
              name,
              description: def.description,
              parameters: def.parameters
            }
          })),
          temperature: 0.2 // Lower temperature for more consistent responses
        });

        const responseMessage = response.choices[0].message;
        
        try {
          // Parse the JSON response
          let parsedResponse = null;
          if (responseMessage.content) {
            parsedResponse = JSON.parse(responseMessage.content);
          } else if (responseMessage.tool_calls) {
            // Handle tool calls directly
            const toolCall = responseMessage.tool_calls[0];
            parsedResponse = {
              type: "action",
              function: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments || '{}')
            };
          }
          
          // Log the response
          logAI({
            response: parsedResponse
          });

          // Add the response to the conversation
          conversationData.messages.push({
            role: "assistant",
            content: responseMessage.content || JSON.stringify(parsedResponse)
          });

          // Handle the response based on its type
          if (parsedResponse.type === "output") {
            // We have our final output
            // Ensure the content is a string
            if (typeof parsedResponse.content === 'object') {
              // Convert object or array to a formatted string
              if (Array.isArray(parsedResponse.content)) {
                // Format array of objects into a nice string
                conversationData.finalOutput = parsedResponse.content.map((item, index) => {
                  if (typeof item === 'object') {
                    return Object.entries(item)
                      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
                      .join('\n');
                  }
                  return `${index + 1}. ${item}`;
                }).join('\n\n');
              } else {
                // Format object into a nice string
                conversationData.finalOutput = Object.entries(parsedResponse.content)
                  .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
                  .join('\n');
              }
            } else {
              conversationData.finalOutput = String(parsedResponse.content);
            }
          } 
          else if (parsedResponse.type === "action") {
            const functionName = parsedResponse.function;
            const functionArgs = parsedResponse.arguments || {};
            
            // Special handling for approveSchedule to ensure correct ID
            if (functionName === 'approveSchedule' && functionArgs.scheduleId) {
              // Find the most recent getPendingSchedules result
              const pendingSchedulesResult = conversationData.toolResults.find(r => r.name === 'getPendingSchedules');
              
              if (pendingSchedulesResult && pendingSchedulesResult.result && pendingSchedulesResult.result.length > 0) {
                // Get the correct schedule ID from the most recent result
                const correctScheduleId = pendingSchedulesResult.result[0].id;
                
                // Log if there's a mismatch
                if (functionArgs.scheduleId !== correctScheduleId) {
                  logAI({
                    type: "schedule_id_mismatch",
                    provided: functionArgs.scheduleId,
                    correct: correctScheduleId
                  });
                  
                  // Override with the correct ID
                  functionArgs.scheduleId = correctScheduleId;
                }
              }
            }
            
            logAI({
              type: "tool_call",
              function: functionName,
              arguments: functionArgs
            });
            
            // Execute the function if it exists
            if (tools[functionName]) {
              try {
                const result = await tools[functionName](functionArgs);
                
                // Log the result
                logAI({
                  type: "tool_result",
                  function: functionName,
                  arguments: functionArgs,
                  raw_response: JSON.stringify(result),
                  result: result
                });
                
                // Store the result
                conversationData.toolResults.push({
                  name: functionName,
                  arguments: functionArgs,
                  result: result
                });
                
                // Add the observation to the conversation
                conversationData.messages.push({
                  role: "system",
                  content: `Tool result: ${JSON.stringify(result)}`
                });
                
              } catch (error) {
                console.error(`Error executing tool ${functionName}:`, error);
                
                // Log the error
                logAI({
                  type: "tool_error",
                  function: functionName,
                  error: error.message
                });
                
                // Store the error
                conversationData.toolResults.push({
                  name: functionName,
                  arguments: functionArgs,
                  error: error.message || 'Error executing function'
                });
                
                // Add the error to the conversation
                conversationData.messages.push({
                  role: "system",
                  content: `Error executing function ${functionName}: ${error.message}`
                });
              }
            } else {
              // Function doesn't exist
              logAI({
                type: "tool_not_found",
                function: functionName
              });
              
              // Store the error
              conversationData.toolResults.push({
                name: functionName,
                arguments: functionArgs,
                error: 'Function not available'
              });
              
              // Add the error to the conversation
              conversationData.messages.push({
                role: "system",
                content: `Function ${functionName} is not available.`
              });
            }
          }
          // For "plan" type, we just continue the loop
        } catch (error) {
          console.error('Error parsing JSON response:', error);
          
          // Log the error
          logAI({
            type: "json_parse_error",
            error: error.message,
            response: responseMessage.content
          });
          
          // Add a message to help the model correct itself
          conversationData.messages.push({
            role: "system",
            content: `There was an error parsing your response. Please respond with valid JSON in one of these formats:
            { "type": "plan", "content": "Your plan description" }
            { "type": "action", "function": "functionName", "arguments": {} }
            { "type": "output", "content": "Your final response to the user" }`
          });
        }
      }
      
      // Log the final AI response
      logAI({
        type: "final_response",
        content: conversationData.finalOutput
      }, 'end');
      
      return {
        content: conversationData.finalOutput,
        functionCalls: conversationData.messages
          .filter(msg => msg.role === "assistant" && msg.content && msg.content.includes && msg.content.includes('"function":'))
          .map(msg => {
            try {
              const parsed = JSON.parse(msg.content);
              return {
                name: parsed.function,
                arguments: parsed.arguments
              };
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean),
        toolResults: conversationData.toolResults
      };
    } catch (error) {
      console.error('Error processing message with OpenAI:', error);
      
      logAI({
        type: "error",
        message: error.message,
        stack: error.stack
      }, 'end');
      
      return {
        content: "I'm sorry, I encountered an error processing your request. Please try again later.",
        error: error.message
      };
    }
  }
}

module.exports = new OpenAIService(); 