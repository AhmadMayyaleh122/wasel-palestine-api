const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const checkpointRoutes = require('./routes/checkpointRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const routeEstimationRoutes = require('./routes/routeEstimationRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', version: 'v1' });
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

// Checkpoint routes
app.use('/api/v1/checkpoints', checkpointRoutes);

// Incident routes
app.use('/api/v1/incidents', incidentRoutes);

// Report routes
app.use('/api/v1/reports', reportRoutes);

// Route estimation routes
app.use('/api/v1/routes', routeEstimationRoutes);

// Alert routes
app.use('/api/v1/alerts', alertRoutes);

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

module.exports = app;
