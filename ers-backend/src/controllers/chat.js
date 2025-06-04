const ChatService = require('../services/chat/ChatService');

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
      
      // Process the command using the ChatService
      const response = await ChatService.processCommand(commandName, args || [], req.user);
      
      return res.status(200).json({
        success: true,
        data: {
          response
        }
      });
    } catch (error) {
      console.error('Error processing chat command:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing command',
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
  }
};

module.exports = ChatController; 