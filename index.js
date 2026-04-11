require('dotenv').config();
const { validateEnv } = require('./src/config/env');
const app = require('./src/app');

validateEnv();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
