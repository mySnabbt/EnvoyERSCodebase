const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/department');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', authenticateToken, DepartmentController.getAllDepartments);

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', authenticateToken, DepartmentController.getDepartmentById);

// @route   POST /api/departments
// @desc    Create a new department
// @access  Private/Admin
router.post('/', authenticateToken, authorizeAdmin, DepartmentController.createDepartment);

// @route   PUT /api/departments/:id
// @desc    Update a department
// @access  Private/Admin
router.put('/:id', authenticateToken, authorizeAdmin, DepartmentController.updateDepartment);

// @route   DELETE /api/departments/:id
// @desc    Delete a department
// @access  Private/Admin
router.delete('/:id', authenticateToken, authorizeAdmin, DepartmentController.deleteDepartment);

module.exports = router; 