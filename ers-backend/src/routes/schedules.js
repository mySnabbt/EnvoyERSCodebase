const express = require('express');
const router = express.Router();
const ScheduleController = require('../controllers/schedule');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// @route   GET /api/schedules
// @desc    Get all schedules with optional filtering
// @access  Private
router.get('/', authenticateToken, ScheduleController.getSchedules);

// @route   GET /api/schedules/admin/pending
// @desc    Get pending schedule requests for admin
// @access  Admin
router.get('/admin/pending', authenticateToken, authorizeAdmin, ScheduleController.getPendingRequests);

// @route   GET /api/schedules/pending
// @desc    Get pending schedule requests for chat feature
// @access  Admin
router.get('/pending', authenticateToken, authorizeAdmin, ScheduleController.getPendingRequests);

// @route   GET /api/schedules/:id
// @desc    Get schedule by ID
// @access  Private
router.get('/:id', authenticateToken, ScheduleController.getScheduleById);

// @route   GET /api/schedules/employee/:employeeId
// @desc    Get schedules for a specific employee
// @access  Private
router.get('/employee/:employeeId', authenticateToken, ScheduleController.getEmployeeSchedules);

// @route   POST /api/schedules
// @desc    Request a new schedule
// @access  Private
router.post('/', authenticateToken, ScheduleController.requestSchedule);

// @route   POST /api/schedules/weekly
// @desc    Request a weekly schedule
// @access  Private
router.post('/weekly', authenticateToken, ScheduleController.requestWeeklySchedule);

// @route   PATCH /api/schedules/:id/approve
// @desc    Approve a schedule request
// @access  Admin only
router.patch('/:id/approve', authenticateToken, authorizeAdmin, ScheduleController.approveSchedule);

// @route   PATCH /api/schedules/:id/reject
// @desc    Reject a schedule request
// @access  Admin only
router.patch('/:id/reject', authenticateToken, authorizeAdmin, ScheduleController.rejectSchedule);

// @route   PUT /api/schedules/:id
// @desc    Update a schedule
// @access  Private (with special handling for non-admin users)
router.put('/:id', authenticateToken, ScheduleController.updateSchedule);

// @route   DELETE /api/schedules/:id
// @desc    Delete a schedule
// @access  Admin only
router.delete('/:id', authenticateToken, authorizeAdmin, ScheduleController.deleteSchedule);

module.exports = router; 