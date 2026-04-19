const express = require('express');
const alertController = require('../controllers/alertController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/subscriptions', authMiddleware, alertController.createSubscription);
router.get('/subscriptions', authMiddleware, alertController.getMySubscriptions);
router.get('/', authMiddleware, alertController.getMyAlerts);
router.put('/:id/read', authMiddleware, alertController.markAlertAsRead);

module.exports = router;