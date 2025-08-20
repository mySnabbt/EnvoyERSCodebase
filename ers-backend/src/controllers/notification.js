const NotificationModel = require('../models/notification');

const NotificationController = {
  // Get user's notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.user_id;
      const includeRead = req.query.include_read === 'true';
      
      const notifications = await NotificationModel.getNotificationsForUser(userId, includeRead);
      
      return res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.user_id;
      
      const count = await NotificationModel.getUnreadCount(userId);
      
      return res.status(200).json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      
      const notification = await NotificationModel.markAsRead(id, userId);
      
      return res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      
      await NotificationModel.markAllAsRead(userId);
      
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      
      await NotificationModel.deleteNotification(id, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = NotificationController;
