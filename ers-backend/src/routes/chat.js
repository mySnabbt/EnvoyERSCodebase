const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/chat/command
// @desc    Process a chat command
// @access  Private
router.post('/command', authenticateToken, ChatController.processCommand);

// @route   GET /api/chat/commands
// @desc    Get available commands for the current user
// @access  Private
router.get('/commands', authenticateToken, ChatController.getCommands);

module.exports = router; 