const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/roster');
const { authenticateToken } = require('../middleware/auth');

// Get weekly roster
router.get('/weekly', authenticateToken, rosterController.getWeeklyRoster);

// Get department roster
router.get('/department/:department_id', authenticateToken, rosterController.getDepartmentRoster);

// Get employee timesheet
router.get('/employee/:employee_id/timesheet', authenticateToken, rosterController.getEmployeeTimesheet);

// Get daily roster
router.get('/daily', authenticateToken, rosterController.getDailyRoster);

// Get employees working at a specific time
router.get('/working', authenticateToken, rosterController.getEmployeesWorkingAtTime);

// Get roster by date range (for timesheet)
router.get('/date-range', authenticateToken, rosterController.getRosterByDateRange);

module.exports = router; 