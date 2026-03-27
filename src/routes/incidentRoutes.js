const express = require('express');
const incidentController = require('../controllers/incidentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Incident Routes
 * Base path: /api/v1/incidents
 */

// Public routes (anyone can read)
router.get('/', incidentController.getAllIncidents);
router.get('/high-severity', incidentController.getHighSeverityIncidents);
router.get('/:id', incidentController.getIncidentById);

// Protected routes (auth required)
router.post('/', authMiddleware, incidentController.createIncident);
router.put('/:id', authMiddleware, incidentController.updateIncidentDetails);
router.put('/:id/status', authMiddleware, incidentController.updateIncidentStatus);

// Moderated actions (admin/moderator only)
router.post('/:id/verify', authMiddleware, incidentController.verifyIncident);
router.post('/:id/close', authMiddleware, incidentController.closeIncident);

// Filter routes
router.get('/checkpoints/:checkpointId/incidents', incidentController.getIncidentsByCheckpoint);
router.get('/categories/:categoryId/incidents', incidentController.getIncidentsByCategory);

module.exports = router;
