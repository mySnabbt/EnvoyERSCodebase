const express = require('express');
const router = express.Router();
const ShiftCancellationController = require('../controllers/shiftCancellation');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// POST /api/shift-cancellations - Request cancellation of a shift
router.post('/', ShiftCancellationController.requestCancellation);

// GET /api/shift-cancellations - Get user's cancellation requests
router.get('/', ShiftCancellationController.getUserCancellations);

// GET /api/shift-cancellations/active - Get all active cancellation requests
router.get('/active', ShiftCancellationController.getActiveCancellations);

// POST /api/shift-cancellations/:id/accept - Accept a cancellation request (take over the shift)
router.post('/:id/accept', ShiftCancellationController.acceptCancellation);

// POST /api/shift-cancellations/:id/admin-reassign - Admin reassign a cancelled shift
router.post('/:id/admin-reassign', authorizeAdmin, ShiftCancellationController.adminReassign);

// DELETE /api/shift-cancellations/:id - Cancel a cancellation request
router.delete('/:id', ShiftCancellationController.cancelCancellationRequest);

module.exports = router;
