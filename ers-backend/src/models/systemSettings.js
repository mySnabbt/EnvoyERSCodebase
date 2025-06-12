const supabase = require('../config/supabase');

const SystemSettingsModel = {
  // Get system settings
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      
      if (error) {
        // If the error is that no rows were returned, return default settings
        if (error.code === 'PGRST116') {
          return { first_day_of_week: 0 }; // Default to Sunday
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting system settings:', error);
      return { first_day_of_week: 0 }; // Default to Sunday on error
    }
  },

  // Update system settings
  async updateSettings(settings) {
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .single();
      
      if (existing) {
        // Update existing settings
        const { data, error } = await supabase
          .from('system_settings')
          .update(settings)
          .eq('id', existing.id)
          .select();
        
        if (error) throw error;
        return data[0];
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('system_settings')
          .insert([settings])
          .select();
        
        if (error) throw error;
        return data[0];
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }
};

module.exports = SystemSettingsModel; 