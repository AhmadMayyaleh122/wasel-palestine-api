const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Public Routes
 */

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Refresh access token
router.post('/refresh', authController.refresh);

/**
 * Protected Routes (need authMiddleware)
 */

// Get current user info
router.get('/me', authMiddleware, authController.getCurrentUser);

// Logout user
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
