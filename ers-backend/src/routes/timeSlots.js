const express = require('express');
const router = express.Router();
const timeSlotController = require('../controllers/timeSlot');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// Get all time slots
router.get('/', authenticateToken, timeSlotController.getTimeSlots);

// Get time slot by ID
router.get('/:id', authenticateToken, timeSlotController.getTimeSlotById);

// Create time slot (admin only)
router.post('/', authenticateToken, authorizeAdmin, timeSlotController.createTimeSlot);

// Update time slot (admin only)
router.put('/:id', authenticateToken, authorizeAdmin, timeSlotController.updateTimeSlot);

// Delete time slot (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, timeSlotController.deleteTimeSlot);

// Set time slot limit (admin only)
router.post('/:id/limit', authenticateToken, authorizeAdmin, timeSlotController.setTimeSlotLimit);

// Check time slot availability
router.get('/:id/availability', authenticateToken, timeSlotController.checkTimeSlotAvailability);

// Check time slot availability for a specific date (only considers approved schedules)
router.get('/:id/availability-for-date', authenticateToken, timeSlotController.checkTimeSlotAvailabilityForDate);

// Check availability for multiple time slots at once
router.post('/batch-availability', authenticateToken, timeSlotController.checkBatchTimeSlotAvailability);

module.exports = router; 