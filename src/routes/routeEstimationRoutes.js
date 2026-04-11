const express = require('express');
const routeEstimationController = require('../controllers/routeEstimationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/estimate', authMiddleware, routeEstimationController.createRouteEstimation);

module.exports = router;