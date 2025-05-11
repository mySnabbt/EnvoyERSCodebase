const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings');
const { authenticateToken } = require('../middleware/auth');

// Settings routes (require authentication)
router.get('/', authenticateToken, SettingsController.getSettings);
router.post('/', authenticateToken, SettingsController.saveSettings);

module.exports = router; 