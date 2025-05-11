const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersTable = 'users';

const UserModel = {
  async register(userData) {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role = 'employee' 
    } = userData;
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from(usersTable)
      .select('email')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Combine first and last name for backward compatibility
    const name = `${firstName} ${lastName}`.trim();
    
    // Create user in Supabase
    const { data, error } = await supabase
      .from(usersTable)
      .insert([
        { 
          email, 
          password: hashedPassword, 
          name,
          first_name: firstName,
          last_name: lastName,
          phone,
          role 
        }
      ])
      .select();
      
    if (error) throw error;
    
    return data[0];
  },
  
  async login(email, password) {
    // Find user by email
    const { data: user, error } = await supabase
      .from(usersTable)
      .select('*')
      .eq('email', email)
      .single();
      
    if (error || !user) {
      throw new Error('Invalid credentials');
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    // Create and return JWT token
    const payload = {
      user_id: user.id,
      email: user.email,
      role: user.role
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    return {
      user: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    };
  },
  
  async getUserById(id) {
    const { data, error } = await supabase
      .from(usersTable)
      .select('id, name, first_name, last_name, email, phone, role, created_at')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    return data;
  },
  
  async getAllUsers() {
    const { data, error } = await supabase
      .from(usersTable)
      .select('id, name, first_name, last_name, email, phone, role, created_at');
      
    if (error) throw error;
    
    return data;
  },
  
  async getUsersWithoutEmployeeProfile() {
    // Method 1: Using a custom SQL query if an RPC function doesn't exist
    const { data, error } = await supabase.rpc('get_users_without_employee_profile');
    
    if (error) {
      console.error('Error using RPC, falling back to client-side filtering:', error);
      
      // Method 2: Get all users, then filter out those with employee profiles
      // Get all users
      const { data: allUsers, error: usersError } = await supabase
        .from(usersTable)
        .select('id, name, first_name, last_name, email, phone, role, created_at');
        
      if (usersError) throw usersError;
      
      // Get all employee user IDs
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('user_id');
        
      if (empError) throw empError;
      
      // Filter out users who already have employee profiles
      const userIdsWithEmployees = employees
        .filter(emp => emp.user_id)
        .map(emp => emp.user_id);
        
      return allUsers.filter(user => !userIdsWithEmployees.includes(user.id));
    }
    
    return data;
  },
  
  async updateUserRole(userId, newRole) {
    if (!['admin', 'employee'].includes(newRole)) {
      throw new Error('Invalid role specified');
    }
    
    const { data, error } = await supabase
      .from(usersTable)
      .update({ role: newRole })
      .eq('id', userId)
      .select();
      
    if (error) throw error;
    
    return data[0];
  }
};

module.exports = UserModel; 