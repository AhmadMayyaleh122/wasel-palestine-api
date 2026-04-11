const express = require('express');
const checkpointController = require('../controllers/checkpointController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Checkpoint Routes
 * Base path: /api/v1/checkpoints
 */

// Public routes (anyone can read)
router.get('/', checkpointController.getAllCheckpoints);
router.get('/:id', checkpointController.getCheckpointById);
router.get('/:id/status-history', checkpointController.getStatusHistory);

// Protected routes (auth required, admin/moderator only for modifications)
router.post('/', authMiddleware, checkpointController.createCheckpoint);
router.put('/:id', authMiddleware, checkpointController.updateCheckpointDetails);
router.put('/:id/status', authMiddleware, checkpointController.updateCheckpointStatus);
router.delete('/:id', authMiddleware, checkpointController.deactivateCheckpoint);

// Area routes
router.get('/areas/:areaId/checkpoints', checkpointController.getCheckpointsByArea);

module.exports = router;
