const EmployeeModel = require('../models/employee');
const UserModel = require('../models/user');

const EmployeeController = {
  async getAllEmployees(req, res) {
    try {
      const filters = req.query || {};
      console.log('Getting employees with filters:', filters);
      
      const employees = await EmployeeModel.getAllEmployees(filters);
      
      return res.status(200).json({
        success: true,
        data: employees
      });
    } catch (error) {
      console.error('Get all employees error:', error.message);
      return res.status(500).json({
        success: false, 
        message: 'Server error'
      });
    }
  },
  
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;
      
      const employee = await EmployeeModel.getEmployeeById(id);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Get employee by id error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getCurrentEmployeeProfile(req, res) {
    try {
      // Get the current user's ID from the request (set by the authenticateToken middleware)
      const userId = req.user.user_id || req.user.id;
      
      console.log('getCurrentEmployeeProfile - Request user:', req.user);
      console.log('getCurrentEmployeeProfile - User ID:', userId);
      
      if (!userId) {
        console.error('No user ID available in token payload');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated or token missing user ID'
        });
      }
      
      // Get the employee record for this user
      console.log('Fetching employee record for user ID:', userId);
      let employee = await EmployeeModel.getEmployeeByUserId(userId);
      
      if (!employee) {
        console.log(`No employee record found for user ID ${userId}`);
        
        // Try to get the user details to create an employee record
        const UserModel = require('../models/user');
        try {
          const user = await UserModel.getUserById(userId);
          
          if (user) {
            console.log('User found, creating employee record automatically');
            // Create an employee record for this user
            const employeeData = {
              name: user.name,
              email: user.email,
              position: 'Employee', // Default position
              user_id: userId,
              hire_date: new Date().toISOString()
            };
            
            employee = await EmployeeModel.createEmployee(employeeData);
            console.log('Created new employee record:', employee.id);
            
            return res.status(200).json({
              success: true,
              data: employee,
              message: 'Employee record created automatically'
            });
          }
        } catch (err) {
          console.error('Error creating employee record:', err);
        }
        
        return res.status(404).json({
          success: false,
          message: 'No employee record found for this user'
        });
      }
      
      console.log('Found employee record:', employee.id);
      return res.status(200).json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Get current employee profile error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async createEmployee(req, res) {
    try {
      // Validate required fields
      const { name, email, position, user_id } = req.body;
      
      if (!name || !email || !position || !user_id) {
        return res.status(400).json({
          success: false,
          message: 'Please provide name, email, position, and user_id'
        });
      }
      
      // Format the employee data
      const employeeData = {
        name,
        email,
        position,
        user_id,
        department_id: req.body.department_id || null,
        hire_date: new Date().toISOString()
      };
      
      const employee = await EmployeeModel.createEmployee(employeeData);
      
      return res.status(201).json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Create employee error:', error.message);
      
      // Handle specific model errors
      if (error.message === 'This user already has an employee profile') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const employeeData = req.body;
      
      // Check if employee exists
      const existingEmployee = await EmployeeModel.getEmployeeById(id);
      
      if (!existingEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      const updatedEmployee = await EmployeeModel.updateEmployee(id, employeeData);
      
      return res.status(200).json({
        success: true,
        data: updatedEmployee
      });
    } catch (error) {
      console.error('Update employee error:', error.message);
      
      // Handle specific model errors
      if (error.message === 'This user already has an employee profile') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      
      // Check if employee exists
      const existingEmployee = await EmployeeModel.getEmployeeById(id);
      
      if (!existingEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      await EmployeeModel.deleteEmployee(id);
      
      return res.status(200).json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      console.error('Delete employee error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getEmployeesByDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      
      const employees = await EmployeeModel.getEmployeesByDepartment(departmentId);
      
      return res.status(200).json({
        success: true,
        data: employees
      });
    } catch (error) {
      console.error('Get employees by department error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = EmployeeController; 