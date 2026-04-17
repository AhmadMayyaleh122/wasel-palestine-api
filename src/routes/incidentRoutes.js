const express = require('express');
const incidentController = require('../controllers/incidentController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
const incidentStaffRoles = ['admin', 'moderator'];

/**
 * Incident Routes
 * Base path: /api/v1/incidents
 */

// Public routes (anyone can read)
router.get('/', incidentController.getAllIncidents);
router.get('/stats', incidentController.getIncidentStats);
router.get('/high-severity', incidentController.getHighSeverityIncidents);
router.get('/by-checkpoint/:checkpointId', incidentController.getIncidentsByCheckpoint);
router.get('/by-category/:categoryId', incidentController.getIncidentsByCategory);
router.get('/:id', incidentController.getIncidentById);

// Crowdsourced reporting: any authenticated user can submit an incident.
router.post('/', authMiddleware, incidentController.createIncident);
router.put('/:id', authMiddleware, roleMiddleware(incidentStaffRoles), incidentController.updateIncidentDetails);
router.put(
  '/:id/status',
  authMiddleware,
  roleMiddleware(incidentStaffRoles),
  incidentController.updateIncidentStatus
);
router.delete('/:id', authMiddleware, roleMiddleware(incidentStaffRoles), incidentController.deleteIncident);

// Moderated actions (admin/moderator only)
router.post('/:id/verify', authMiddleware, roleMiddleware(incidentStaffRoles), incidentController.verifyIncident);
router.post('/:id/close', authMiddleware, roleMiddleware(incidentStaffRoles), incidentController.closeIncident);

module.exports = router;
