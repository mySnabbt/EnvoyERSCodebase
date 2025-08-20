const supabase = require('../config/supabase');

const NotificationModel = {
  // Get all notifications for a user
  async getNotificationsForUser(userId, includeRead = false) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeRead) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Create a notification
  async createNotification(notificationData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Create notifications for multiple users
  async createBulkNotifications(notifications) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return data;
  },

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return data;
  },

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  // Get unread count for user
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count;
  },

  // Clean up expired notifications
  async cleanupExpired() {
    const { data, error } = await supabase.rpc('cleanup_expired_items');
    if (error) throw error;
    return data;
  },

  // Instant cleanup: Delete all notifications related to a specific cancellation request
  async deleteNotificationsByCancellationRequest(cancellationRequestId) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'shift_cancellation')
      .contains('data', { cancellation_request_id: cancellationRequestId });

    if (error) throw error;
    return data;
  },

  // Instant cleanup: Delete notifications by data criteria
  async deleteNotificationsByData(criteria) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .contains('data', criteria);

    if (error) throw error;
    return data;
  }
};

module.exports = NotificationModel;
