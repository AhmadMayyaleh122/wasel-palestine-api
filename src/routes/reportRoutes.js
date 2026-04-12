const express = require('express');
const reportController = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
const reportStaffRoles = ['admin', 'moderator'];

router.post('/', authMiddleware, reportController.createReport);
router.post('/:id/vote', authMiddleware, reportController.voteOnReport);
router.put('/:id/status', authMiddleware, roleMiddleware(reportStaffRoles), reportController.updateReportStatus);
router.get('/', authMiddleware, roleMiddleware(reportStaffRoles), reportController.getAllReports);
router.get('/:id', authMiddleware, roleMiddleware(reportStaffRoles), reportController.getReportById);

module.exports = router;