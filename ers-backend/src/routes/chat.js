const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/chat/command
// @desc    Process a chat command
// @access  Private
router.post('/command', authenticateToken, ChatController.processCommand);

// @route   POST /api/chat/message
// @desc    Process a natural language message
// @access  Private
router.post('/message', authenticateToken, ChatController.processMessage);

// @route   GET /api/chat/commands
// @desc    Get available commands for the current user
// @access  Private
router.get('/commands', authenticateToken, ChatController.getCommands);

// @route   POST /api/chat/clear
// @desc    Clear chat history for the current user
// @access  Private
router.post('/clear', authenticateToken, ChatController.clearChatHistory);

// @route   GET /api/chat/debug-logs
// @desc    Get AI debug logs
// @access  Private (admin only)
router.get('/debug-logs', authenticateToken, (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
}, ChatController.getDebugLogs);

module.exports = router; 