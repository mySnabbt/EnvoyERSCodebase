const NotificationModel = require('../models/notification');
const ShiftCancellationModel = require('../models/shiftCancellation');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start the cleanup service
  start() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting cleanup service...');

    // Run cleanup immediately
    this.runCleanup();

    // Run cleanup every 30 minutes (backup safety net)
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, 30 * 60 * 1000); // 30 minutes

    console.log('Cleanup service started - running every 30 minutes (backup safety net)');
  }

  // Stop the cleanup service
  stop() {
    if (!this.isRunning) {
      console.log('Cleanup service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Cleanup service stopped');
  }

  // Run the cleanup process (backup safety net)
  async runCleanup() {
    try {
      console.log('🧹 Running scheduled cleanup (backup safety net)...');

      // Clean up expired notifications and cancellation requests
      await NotificationModel.cleanupExpired();
      
      console.log('✅ Backup cleanup completed successfully');
    } catch (error) {
      console.error('❌ Error during backup cleanup:', error);
    }
  }

  // Instant cleanup for specific cancellation request (called immediately after actions)
  async instantCleanup(cancellationRequestId) {
    try {
      console.log(`🚀 Running instant cleanup for cancellation request: ${cancellationRequestId}`);
      
      await NotificationModel.deleteNotificationsByCancellationRequest(cancellationRequestId);
      
      console.log(`✅ Instant cleanup completed for request: ${cancellationRequestId}`);
    } catch (error) {
      console.error(`❌ Error during instant cleanup for request ${cancellationRequestId}:`, error);
      throw error; // Re-throw so calling code can handle it
    }
  }
}

// Create singleton instance
const cleanupService = new CleanupService();

module.exports = cleanupService;
