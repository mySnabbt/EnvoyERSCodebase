const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/employee');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private
router.get('/', authenticateToken, EmployeeController.getAllEmployees);

// @route   GET /api/employees/me
// @desc    Get current user's employee profile
// @access  Private
router.get('/me', authenticateToken, EmployeeController.getCurrentEmployeeProfile);

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private
router.get('/:id', authenticateToken, EmployeeController.getEmployeeById);

// @route   POST /api/employees
// @desc    Create a new employee
// @access  Private/Admin
router.post('/', authenticateToken, authorizeAdmin, EmployeeController.createEmployee);

// @route   PUT /api/employees/:id
// @desc    Update an employee
// @access  Private/Admin
router.put('/:id', authenticateToken, authorizeAdmin, EmployeeController.updateEmployee);

// @route   DELETE /api/employees/:id
// @desc    Delete an employee
// @access  Private/Admin
router.delete('/:id', authenticateToken, authorizeAdmin, EmployeeController.deleteEmployee);

// @route   GET /api/employees/department/:departmentId
// @desc    Get employees by department
// @access  Private
router.get('/department/:departmentId', authenticateToken, EmployeeController.getEmployeesByDepartment);

module.exports = router; 