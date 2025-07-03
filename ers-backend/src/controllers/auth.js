const UserModel = require('../models/user');
const PasswordResetModel = require('../models/passwordReset');
const EmailService = require('../services/EmailService');

const AuthController = {
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email, password, first name, and last name'
        });
      }
      
      // Create user with employee role only
      const user = await UserModel.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'employee' // Force role to employee regardless of what was sent
      });
      
      // Return success without sensitive data
      return res.status(201).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      if (error.message === 'User already exists') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }
      
      // Authenticate user
      const authData = await UserModel.login(email, password);
      
      return res.status(200).json({
        success: true,
        data: authData
      });
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getCurrentUser(req, res) {
    try {
      const user = await UserModel.getUserById(req.user.user_id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getAllUsers(req, res) {
    try {
      const users = await UserModel.getAllUsers();
      
      return res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getUsersWithoutEmployeeProfile(req, res) {
    try {
      const users = await UserModel.getUsersWithoutEmployeeProfile();
      
      return res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get users without employee profiles error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          message: 'User ID and role are required'
        });
      }
      
      // Ensure role is valid
      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Must be "admin" or "employee"'
        });
      }
      
      // Check if user exists
      const existingUser = await UserModel.getUserById(userId);
      
      if (!existingUser) {
        return res.status(404).json({
          success: false, 
          message: 'User not found'
        });
      }
      
      // Update user role
      const updatedUser = await UserModel.updateUserRole(userId, role);
      
      return res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error('Update user role error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      console.log('Forgot password request received for email:', email);
      
      if (!email) {
        console.log('Email is required but not provided');
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      // Find user by email
      console.log('Looking up user by email...');
      const user = await UserModel.getUserByEmail(email);
      
      // Don't reveal if user exists or not for security reasons
      if (!user) {
        console.log('User not found with email:', email);
        return res.status(200).json({
          success: true,
          message: 'If your email is registered, you will receive password reset instructions'
        });
      }
      
      console.log('User found, generating reset token...');
      
      // Generate reset token
      const token = await PasswordResetModel.createResetToken(user.id);
      
      // Create reset link
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
      console.log('Reset link generated:', resetLink);
      
      // Send email
      console.log('Sending password reset email...');
      await EmailService.sendPasswordResetEmail(email, resetLink);
      
      console.log('Password reset email sent successfully');
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive password reset instructions'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      
      console.log('Reset password request received:');
      console.log('- Token provided:', token ? `${token.substring(0, 10)}...` : 'none');
      console.log('- Password length:', password ? password.length : 0);
      
      if (!token || !password) {
        console.log('Validation failed: Missing token or password');
        return res.status(400).json({
          success: false,
          message: 'Token and password are required'
        });
      }
      
      // Validate token
      console.log('Validating token...');
      const tokenData = await PasswordResetModel.validateToken(token);
      
      if (!tokenData) {
        console.log('Token validation failed: Invalid or expired token');
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      console.log('Token validated successfully. User ID:', tokenData.user_id);
      
      // Update user password
      console.log('Updating user password...');
      await UserModel.updatePassword(tokenData.user_id, password);
      
      // Mark token as used
      console.log('Marking token as used...');
      await PasswordResetModel.markTokenAsUsed(tokenData.id);
      
      console.log('Password reset successful');
      return res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = AuthController; 