const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const routeEstimationRoutes = require('./routes/routeEstimationRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

const rateLimitDefaults = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
};

const globalLimiter = rateLimit({
  ...rateLimitDefaults,
  max: 200,
  skip: (req) => req.path.startsWith('/api/v1/auth'),
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  ...rateLimitDefaults,
  max: 20,
  message: { status: 'error', message: 'Too many auth attempts, please try again later.' },
});

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(globalLimiter);

app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/routes', routeEstimationRoutes);
app.use('/api/v1/alerts', alertRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', version: 'v1' });
});

// Auth routes
app.use('/api/v1/auth', authLimiter, authRoutes);

// Checkpoint routes
app.use('/api/v1/checkpoints', checkpointRoutes);

// Incident routes
app.use('/api/v1/incidents', incidentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

module.exports = app;//