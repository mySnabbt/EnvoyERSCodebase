const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/notifications - Get user's notifications
router.get('/', NotificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', NotificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', NotificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', NotificationController.markAllAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;
