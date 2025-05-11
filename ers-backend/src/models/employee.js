const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

const employeesTable = 'employees';

const EmployeeModel = {
  // Get all employees
  async getAllEmployees(filters = {}) {
    let query = supabase
      .from(employeesTable)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `);
    
    // Apply filters if provided
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    
    // Always sort by name
    query = query.order('name');
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },

  // Get employee by ID
  async getEmployeeById(id) {
    const { data, error } = await supabase
      .from(employeesTable)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get employee by user ID
  async getEmployeeByUserId(userId) {
    const { data, error } = await supabase
      .from(employeesTable)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Get employee by email
  getEmployeeByEmail: async (email) => {
    const { data, error } = await supabase
      .from(employeesTable)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `)
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create a new employee
  async createEmployee(employeeData) {
    // Ensure user_id is provided
    if (!employeeData.user_id) {
      throw new Error('Employee must be associated with a user account');
    }

    // Check if user already has an employee profile
    const existingEmployee = await EmployeeModel.getEmployeeByUserId(employeeData.user_id);
    if (existingEmployee) {
      throw new Error('This user already has an employee profile');
    }

    const { data, error } = await supabase
      .from(employeesTable)
      .insert([employeeData])
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `);
    
    if (error) throw error;
    return data[0];
  },

  // Update an employee
  async updateEmployee(id, employeeData) {
    // If changing user_id, check it doesn't conflict
    if (employeeData.user_id) {
      const currentEmployee = await EmployeeModel.getEmployeeById(id);
      
      // Only need to check if user_id is changing
      if (currentEmployee && currentEmployee.user_id !== employeeData.user_id) {
        const existingEmployee = await EmployeeModel.getEmployeeByUserId(employeeData.user_id);
        if (existingEmployee && existingEmployee.id !== id) {
          throw new Error('This user already has an employee profile');
        }
      }
    }

    const { data, error } = await supabase
      .from(employeesTable)
      .update(employeeData)
      .eq('id', id)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `);
    
    if (error) throw error;
    return data[0];
  },

  // Delete an employee
  async deleteEmployee(id) {
    const { error } = await supabase
      .from(employeesTable)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  // Authenticate employee
  authenticateEmployee: async (email, password) => {
    const employee = await EmployeeModel.getEmployeeByEmail(email);
    
    if (!employee) return null;
    
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) return null;
    
    return employee;
  },

  // Get employees by department
  async getEmployeesByDepartment(departmentId) {
    const { data, error } = await supabase
      .from(employeesTable)
      .select(`
        *,
        user:user_id(id, name, first_name, last_name, email, phone, role)
      `)
      .eq('department_id', departmentId)
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

module.exports = EmployeeModel; 