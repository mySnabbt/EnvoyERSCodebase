const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', AuthController.register);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', AuthController.login);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', AuthController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', AuthController.resetPassword);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, AuthController.getCurrentUser);

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Admin only
router.get('/users', authenticateToken, authorizeAdmin, AuthController.getAllUsers);

// @route   GET /api/auth/users/without-employee
// @desc    Get users who don't have an employee profile
// @access  Admin only
router.get('/users/without-employee', authenticateToken, authorizeAdmin, AuthController.getUsersWithoutEmployeeProfile);

// @route   PATCH /api/auth/users/:userId/role
// @desc    Update user role (promote/demote)
// @access  Admin only
router.patch('/users/:userId/role', authenticateToken, authorizeAdmin, AuthController.updateUserRole);

module.exports = router; 