const DepartmentModel = require('../models/department');

const DepartmentController = {
  async getAllDepartments(req, res) {
    try {
      const departments = await DepartmentModel.getAllDepartments();
      
      return res.status(200).json({
        success: true,
        data: departments
      });
    } catch (error) {
      console.error('Get all departments error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      
      const department = await DepartmentModel.getDepartmentById(id);
      
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Get department by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async createDepartment(req, res) {
    try {
      const { name, description } = req.body;
      
      // Validate name
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Department name is required'
        });
      }
      
      const department = await DepartmentModel.createDepartment({
        name,
        description
      });
      
      return res.status(201).json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Create department error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const departmentData = req.body;
      
      // Check if department exists
      const existingDepartment = await DepartmentModel.getDepartmentById(id);
      
      if (!existingDepartment) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      const updatedDepartment = await DepartmentModel.updateDepartment(id, departmentData);
      
      return res.status(200).json({
        success: true,
        data: updatedDepartment
      });
    } catch (error) {
      console.error('Update department error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      
      // Check if department exists
      const existingDepartment = await DepartmentModel.getDepartmentById(id);
      
      if (!existingDepartment) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      try {
        await DepartmentModel.deleteDepartment(id);
        
        return res.status(200).json({
          success: true,
          message: 'Department deleted successfully'
        });
      } catch (deleteError) {
        if (deleteError.message === 'Cannot delete department with employees') {
          return res.status(400).json({
            success: false,
            message: deleteError.message
          });
        }
        throw deleteError;
      }
    } catch (error) {
      console.error('Delete department error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = DepartmentController; 