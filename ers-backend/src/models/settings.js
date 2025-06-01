const supabase = require('../config/supabase');

const SettingsModel = {
  // Get system settings
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      // Return the first settings object, or default settings if none exist
      return data && data.length > 0 ? 
        data[0] : 
        { first_day_of_week: 1 }; // Default to Monday (1) as first day
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return { first_day_of_week: 1 }; // Default to Monday (1) as first day
    }
  },
  
  // Save system settings
  async saveSettings(settings) {
    try {
      // Try to update existing settings first
      const { data: existingSettings } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1);
      
      if (existingSettings && existingSettings.length > 0) {
        // Update existing settings
        const { data, error } = await supabase
          .from('system_settings')
          .update(settings)
          .eq('id', existingSettings[0].id)
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
      console.error('Error saving system settings:', error);
      throw error;
    }
  },
  
  // Get the day of week based on JavaScript day and system settings
  async getDayOfWeek(jsDay) {
    try {
      const settings = await this.getSettings();
      const firstDayOfWeek = settings.first_day_of_week;
      
      // Convert from JavaScript day to system day
      return (jsDay - firstDayOfWeek + 7) % 7;
    } catch (error) {
      console.error('Error calculating day of week:', error);
      return jsDay; // Default to JavaScript day if error
    }
  },
  
  // Convert system day of week back to JavaScript day of week
  async getJavaScriptDayOfWeek(systemDay) {
    try {
      const settings = await this.getSettings();
      const firstDayOfWeek = settings.first_day_of_week;
      
      // Convert from system day to JavaScript day
      return (systemDay + firstDayOfWeek) % 7;
    } catch (error) {
      console.error('Error calculating JavaScript day of week:', error);
      return systemDay; // Default to system day if error
    }
  }
};

module.exports = SettingsModel; 