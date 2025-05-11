const supabase = require('../config/supabase');

const departmentsTable = 'departments';

const DepartmentModel = {
  // Get all departments with employee counts
  async getAllDepartments() {
    // First get all departments
    const { data: departments, error } = await supabase
      .from(departmentsTable)
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    // Then get employee counts for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (department) => {
        const { count, error: countError } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', department.id);
        
        if (countError) throw countError;
        
        return {
          ...department,
          employeeCount: count || 0
        };
      })
    );
    
    return departmentsWithCounts;
  },

  // Get department by ID
  async getDepartmentById(id) {
    const { data, error } = await supabase
      .from(departmentsTable)
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    return data;
  },

  // Create a new department
  async createDepartment(departmentData) {
    const { data, error } = await supabase
      .from(departmentsTable)
      .insert([departmentData])
      .select();
      
    if (error) throw error;
    
    return data[0];
  },

  // Update a department
  async updateDepartment(id, departmentData) {
    const { data, error } = await supabase
      .from(departmentsTable)
      .update(departmentData)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    
    return data[0];
  },

  // Delete a department
  async deleteDepartment(id) {
    // First check if there are employees in this department
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('department_id', id);
      
    if (employeeError) throw employeeError;
    
    if (employees.length > 0) {
      throw new Error('Cannot delete department with employees');
    }
    
    const { error } = await supabase
      .from(departmentsTable)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return { success: true };
  },
  
  // Get employees in a department
  getDepartmentEmployees: async (departmentId) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('department_id', departmentId)
      .order('name');
    
    if (error) throw error;
    return data;
  }
};

module.exports = DepartmentModel; 