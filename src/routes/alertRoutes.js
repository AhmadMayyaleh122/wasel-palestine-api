const express = require('express');
const alertController = require('../controllers/alertController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/subscriptions', authMiddleware, alertController.createSubscription);
router.get('/subscriptions', authMiddleware, alertController.getMySubscriptions);
router.delete('/subscriptions/:id', authMiddleware, alertController.deleteSubscription);
//hi 
module.exports = router;