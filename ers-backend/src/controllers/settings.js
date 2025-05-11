const SettingsModel = require('../models/settings');

const SettingsController = {
  // Get system settings
  async getSettings(req, res) {
    try {
      const settings = await SettingsModel.getSettings();
      
      return res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },
  
  // Save system settings
  async saveSettings(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can change system settings'
        });
      }
      
      const { first_day_of_week } = req.body;
      
      // Validate first_day_of_week
      if (first_day_of_week === undefined || first_day_of_week < 0 || first_day_of_week > 6) {
        return res.status(400).json({
          success: false,
          message: 'First day of week must be between 0 (Sunday) and 6 (Saturday)'
        });
      }
      
      const settings = await SettingsModel.saveSettings({
        first_day_of_week
      });
      
      return res.status(200).json({
        success: true,
        message: 'Settings saved successfully',
        data: settings
      });
    } catch (error) {
      console.error('Save settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = SettingsController; 