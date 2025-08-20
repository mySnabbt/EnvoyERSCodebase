const ShiftCancellationModel = require('../models/shiftCancellation');
const NotificationModel = require('../models/notification');
const ScheduleModel = require('../models/schedule');
const EmployeeModel = require('../models/employee');
const UserModel = require('../models/user');

const ShiftCancellationController = {
  // Request cancellation of a shift
  async requestCancellation(req, res) {
    try {
      const { schedule_id, reason } = req.body;
      const userId = req.user.user_id;

      if (!schedule_id) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      // Get the schedule details
      const schedule = await ScheduleModel.getScheduleById(schedule_id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      // Check if user is the owner of this schedule (or admin)
      if (req.user.role !== 'admin') {
        const userEmployee = await EmployeeModel.getEmployeeByUserId(userId);
        if (!userEmployee || userEmployee.id !== schedule.employee_id) {
          return res.status(403).json({
            success: false,
            message: 'You can only cancel your own schedules'
          });
        }
      }

      // Check if schedule is in the future
      const scheduleDateTime = new Date(`${schedule.date}T${schedule.start_time}`);
      if (scheduleDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a shift that has already started or passed'
        });
      }

      // Check if there's already a pending cancellation request
      const hasPending = await ShiftCancellationModel.hasPendingCancellation(schedule_id);
      if (hasPending) {
        return res.status(400).json({
          success: false,
          message: 'There is already a pending cancellation request for this shift'
        });
      }

      // Set expiration time to 1 hour before the shift starts
      const expiresAt = new Date(scheduleDateTime.getTime() - (60 * 60 * 1000)); // 1 hour before

      // Create cancellation request
      const cancellationRequest = await ShiftCancellationModel.createCancellationRequest({
        schedule_id,
        requested_by: userId,
        reason: reason || 'No reason provided',
        expires_at: expiresAt.toISOString()
      });

      // Get all users to notify (excluding the requester)
      const allUsers = await UserModel.getAllUsers();
      const usersToNotify = allUsers.filter(user => user.id !== userId);

      // Prepare notification data
      const shiftInfo = `${schedule.time_slot?.name || 'Shift'} on ${new Date(schedule.date).toLocaleDateString()} from ${schedule.start_time} to ${schedule.end_time}`;
      const requesterName = req.user.name || req.user.email;

      const notifications = usersToNotify.map(user => ({
        user_id: user.id,
        type: 'shift_cancellation',
        title: 'Shift Cancellation Request',
        message: `${requesterName} wants to cancel their shift: ${shiftInfo}. Can you work this time?`,
        data: {
          cancellation_request_id: cancellationRequest.id,
          schedule_id: schedule_id,
          shift_info: shiftInfo,
          requested_by: userId,
          requester_name: requesterName
        },
        expires_at: expiresAt.toISOString()
      }));

      // Create notifications for all users
      await NotificationModel.createBulkNotifications(notifications);

      return res.status(201).json({
        success: true,
        message: 'Cancellation request created successfully',
        data: cancellationRequest
      });

    } catch (error) {
      console.error('Request cancellation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Accept a cancellation request (take over the shift)
  async acceptCancellation(req, res) {
    try {
      const { id } = req.params; // cancellation request ID
      const userId = req.user.user_id;

      // Get the cancellation request
      const cancellationRequest = await ShiftCancellationModel.getCancellationRequestById(id);
      if (!cancellationRequest) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation request not found'
        });
      }

      if (cancellationRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'This cancellation request has already been processed'
        });
      }

      // Check if not expired
      if (new Date(cancellationRequest.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'This cancellation request has expired'
        });
      }

      // Get user's employee record
      const userEmployee = await EmployeeModel.getEmployeeByUserId(userId);
      if (!userEmployee) {
        return res.status(403).json({
          success: false,
          message: 'You do not have an employee profile'
        });
      }

      // Check if user already has a conflicting schedule
      const existingSchedules = await ScheduleModel.getEmployeeSchedules(userEmployee.id, {
        status: 'approved',
        start_date: cancellationRequest.schedule.date,
        end_date: cancellationRequest.schedule.date
      });

      const hasConflict = existingSchedules.some(schedule => {
        const existingStart = schedule.start_time;
        const existingEnd = schedule.end_time;
        const newStart = cancellationRequest.schedule.start_time;
        const newEnd = cancellationRequest.schedule.end_time;

        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (hasConflict) {
        return res.status(400).json({
          success: false,
          message: 'You already have a conflicting schedule at this time'
        });
      }

      // Fulfill the cancellation request
      const result = await ShiftCancellationModel.fulfillCancellationRequest(
        id,
        userId,
        userEmployee.id
      );

      // Create notifications to inform everyone that the shift has been taken
      const allUsers = await UserModel.getAllUsers();
      const shiftInfo = `${cancellationRequest.schedule.time_slot?.name || 'Shift'} on ${new Date(cancellationRequest.schedule.date).toLocaleDateString()} from ${cancellationRequest.schedule.start_time} to ${cancellationRequest.schedule.end_time}`;
      const accepterName = req.user.name || req.user.email;

      const notifications = allUsers.map(user => ({
        user_id: user.id,
        type: 'shift_cancellation',
        title: 'Shift Reassigned',
        message: `The shift cancellation request for ${shiftInfo} has been accepted by ${accepterName}.`,
        data: {
          cancellation_request_id: id,
          schedule_id: cancellationRequest.schedule_id,
          shift_info: shiftInfo,
          accepted_by: userId,
          accepter_name: accepterName,
          action: 'accepted'
        }
      }));

      await NotificationModel.createBulkNotifications(notifications);

      // 🚀 INSTANT CLEANUP: Remove all related cancellation notifications immediately
      try {
        await NotificationModel.deleteNotificationsByCancellationRequest(id);
        console.log(`✅ Instant cleanup: Removed all notifications for cancellation request ${id}`);
      } catch (cleanupError) {
        console.error('⚠️ Warning: Instant cleanup failed, but shift was still accepted:', cleanupError);
        // Don't fail the whole operation if cleanup fails
      }

      return res.status(200).json({
        success: true,
        message: 'Shift accepted successfully',
        data: result
      });

    } catch (error) {
      console.error('Accept cancellation error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Server error'
      });
    }
  },

  // Admin reassignment of a cancelled shift
  async adminReassign(req, res) {
    try {
      const { id } = req.params; // cancellation request ID
      const { employee_id } = req.body;
      const userId = req.user.user_id;

      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can reassign shifts'
        });
      }

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Get the cancellation request
      const cancellationRequest = await ShiftCancellationModel.getCancellationRequestById(id);
      if (!cancellationRequest) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation request not found'
        });
      }

      if (cancellationRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'This cancellation request has already been processed'
        });
      }

      // Verify the employee exists
      const targetEmployee = await EmployeeModel.getEmployeeById(employee_id);
      if (!targetEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Target employee not found'
        });
      }

      // Check if employee already has a conflicting schedule (unless it's the same employee)
      if (targetEmployee.id !== cancellationRequest.schedule.employee_id) {
        const existingSchedules = await ScheduleModel.getEmployeeSchedules(employee_id, {
          status: 'approved',
          start_date: cancellationRequest.schedule.date,
          end_date: cancellationRequest.schedule.date
        });

        const hasConflict = existingSchedules.some(schedule => {
          const existingStart = schedule.start_time;
          const existingEnd = schedule.end_time;
          const newStart = cancellationRequest.schedule.start_time;
          const newEnd = cancellationRequest.schedule.end_time;

          return (newStart < existingEnd && newEnd > existingStart);
        });

        if (hasConflict) {
          return res.status(400).json({
            success: false,
            message: 'The selected employee already has a conflicting schedule at this time'
          });
        }
      }

      // Fulfill the cancellation request
      const result = await ShiftCancellationModel.fulfillCancellationRequest(
        id,
        userId,
        employee_id
      );

      // Create notifications to inform everyone
      const allUsers = await UserModel.getAllUsers();
      const shiftInfo = `${cancellationRequest.schedule.time_slot?.name || 'Shift'} on ${new Date(cancellationRequest.schedule.date).toLocaleDateString()} from ${cancellationRequest.schedule.start_time} to ${cancellationRequest.schedule.end_time}`;
      const adminName = req.user.name || req.user.email;

      const notifications = allUsers.map(user => ({
        user_id: user.id,
        type: 'shift_cancellation',
        title: 'Shift Reassigned by Admin',
        message: `The shift cancellation request for ${shiftInfo} has been reassigned to ${targetEmployee.name} by admin ${adminName}.`,
        data: {
          cancellation_request_id: id,
          schedule_id: cancellationRequest.schedule_id,
          shift_info: shiftInfo,
          reassigned_to: employee_id,
          reassigned_by: userId,
          admin_name: adminName,
          new_employee_name: targetEmployee.name,
          action: 'admin_reassigned'
        }
      }));

      await NotificationModel.createBulkNotifications(notifications);

      // 🚀 INSTANT CLEANUP: Remove all related cancellation notifications immediately  
      try {
        await NotificationModel.deleteNotificationsByCancellationRequest(id);
        console.log(`✅ Instant cleanup: Removed all notifications for cancellation request ${id} (admin reassign)`);
      } catch (cleanupError) {
        console.error('⚠️ Warning: Instant cleanup failed, but shift was still reassigned:', cleanupError);
        // Don't fail the whole operation if cleanup fails
      }

      return res.status(200).json({
        success: true,
        message: 'Shift reassigned successfully',
        data: result
      });

    } catch (error) {
      console.error('Admin reassign error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Server error'
      });
    }
  },

  // Get active cancellation requests
  async getActiveCancellations(req, res) {
    try {
      const cancellationRequests = await ShiftCancellationModel.getActiveCancellationRequests();

      return res.status(200).json({
        success: true,
        data: cancellationRequests
      });
    } catch (error) {
      console.error('Get active cancellations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get user's cancellation requests
  async getUserCancellations(req, res) {
    try {
      const userId = req.user.user_id;
      const cancellationRequests = await ShiftCancellationModel.getCancellationRequestsForUser(userId);

      return res.status(200).json({
        success: true,
        data: cancellationRequests
      });
    } catch (error) {
      console.error('Get user cancellations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Cancel a cancellation request
  async cancelCancellationRequest(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const cancelledRequest = await ShiftCancellationModel.cancelCancellationRequest(id, userId);

      if (!cancelledRequest) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation request not found or already processed'
        });
      }

      // 🚀 INSTANT CLEANUP: Remove all related cancellation notifications immediately
      try {
        await NotificationModel.deleteNotificationsByCancellationRequest(id);
        console.log(`✅ Instant cleanup: Removed all notifications for cancelled request ${id}`);
      } catch (cleanupError) {
        console.error('⚠️ Warning: Instant cleanup failed, but request was still cancelled:', cleanupError);
        // Don't fail the whole operation if cleanup fails
      }

      return res.status(200).json({
        success: true,
        message: 'Cancellation request cancelled',
        data: cancelledRequest
      });

    } catch (error) {
      console.error('Cancel cancellation request error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = ShiftCancellationController;
