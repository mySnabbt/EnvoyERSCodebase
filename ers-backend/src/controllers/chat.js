const ChatService = require('../services/chat/ChatService');

// Global array to store recent AI debug logs
const aiDebugLogs = [];
const MAX_DEBUG_LOGS = 50;

// Function to add a log entry
function addDebugLog(type, data) {
  if (process.env.DEBUG_AI_LOGS === 'true') {
    const logEntry = {
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    aiDebugLogs.push(logEntry);
    
    // Keep only the most recent logs
    if (aiDebugLogs.length > MAX_DEBUG_LOGS) {
      aiDebugLogs.shift();
    }
  }
}

// Export the debug logs and add function for use in other modules
exports.aiDebugLogs = aiDebugLogs;
exports.addDebugLog = addDebugLog;

const ChatController = {
  /**
   * Process a chat command
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processCommand(req, res) {
    try {
      const { command, args } = req.body;
      
      if (!command) {
        return res.status(400).json({
          success: false,
          message: 'Command is required'
        });
      }
      
      // Extract command name (remove leading slash if present)
      const commandName = command.startsWith('/') ? command.substring(1) : command;
      
      // Add debug log
      addDebugLog('command', { command: commandName, args: args || [] });
      
      // Process the command using the ChatService
      const response = await ChatService.processCommand(commandName, args || [], req.user);
      
      // Add debug log for response
      addDebugLog('command_response', { response });
      
      return res.status(200).json({
        success: true,
        data: {
          response,
          debugLogs: process.env.DEBUG_AI_LOGS === 'true' ? aiDebugLogs : []
        }
      });
    } catch (error) {
      console.error('Error processing chat command:', error);
      
      // Add debug log for error
      addDebugLog('error', { message: error.message, stack: error.stack });
      
      return res.status(500).json({
        success: false,
        message: 'Error processing command',
        error: error.message
      });
    }
  },
  
  /**
   * Process a natural language message
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async processMessage(req, res) {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }
      
      // Add debug log
      addDebugLog('message', { message });
      
      // Check if it's a command (starts with /)
      if (message.startsWith('/')) {
        const commandParts = message.substring(1).split(' ');
        const commandName = commandParts[0];
        const args = commandParts.slice(1);
        
        // Add debug log for command
        addDebugLog('command_from_message', { command: commandName, args });
        
        // Process as a command
        const response = await ChatService.processCommand(commandName, args, req.user);
        
        // Add debug log for response
        addDebugLog('command_response', { response });
        
        return res.status(200).json({
          success: true,
          data: {
            response,
            isCommand: true,
            debugLogs: process.env.DEBUG_AI_LOGS === 'true' ? aiDebugLogs : []
          }
        });
      }
      
      // Process as a natural language message
      const result = await ChatService.processMessage(message, req.user);
      
      // Add debug log for AI response
      addDebugLog('ai_response', { 
        response: result.response,
        hasFunctionCalls: !!result.functionCalls,
        toolResults: result.toolResults
      });
      
      return res.status(200).json({
        success: true,
        data: {
          response: result.response,
          isCommand: false,
          functionCalls: result.functionCalls,
          toolResults: result.toolResults,
          debugLogs: process.env.DEBUG_AI_LOGS === 'true' ? aiDebugLogs : []
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add debug log for error
      addDebugLog('error', { message: error.message, stack: error.stack });
      
      return res.status(500).json({
        success: false,
        message: 'Error processing message',
        error: error.message
      });
    }
  },
  
  /**
   * Get a list of available commands for the current user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCommands(req, res) {
    try {
      // Use the help command to get a list of available commands
      const response = await ChatService.processCommand('help', [], req.user);
      
      return res.status(200).json({
        success: true,
        data: {
          response
        }
      });
    } catch (error) {
      console.error('Error getting commands:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting commands',
        error: error.message
      });
    }
  },
  
  /**
   * Get AI debug logs
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDebugLogs(req, res) {
    try {
      // Only return logs if debug mode is enabled
      if (process.env.DEBUG_AI_LOGS !== 'true') {
        return res.status(403).json({
          success: false,
          message: 'Debug logs are disabled'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          logs: aiDebugLogs
        }
      });
    } catch (error) {
      console.error('Error getting debug logs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting debug logs',
        error: error.message
      });
    }
  },
  
  /**
   * Clear chat history for the current user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearChatHistory(req, res) {
    try {
      const success = ChatService.clearChatHistory(req.user);
      
      if (success) {
        return res.status(200).json({
          success: true,
          message: 'Chat history cleared successfully'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Failed to clear chat history'
        });
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error clearing chat history',
        error: error.message
      });
    }
  }
};

module.exports = ChatController; 