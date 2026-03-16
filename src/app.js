const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', version: 'v1' });
});

module.exports = app;