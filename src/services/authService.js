const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/database');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateTokens = (userId, email, role) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};






// Register new user
const register = async (email, password, fullName, phone) => {
  const existingUser = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
  
  if (existingUser.rows.length > 0) {
    throw new Error('Email already in use');
  }

  const passwordHash = await hashPassword(password);

  const userResult = await pool.query(
    'INSERT INTO "User" (email, "passwordHash", "fullName", phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, "fullName", role',
    [email, passwordHash, fullName, phone, 'citizen']
  );

  const user = userResult.rows[0];
  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const tokenHash = await hashPassword(refreshToken);

  await pool.query(
    'INSERT INTO "RefreshToken" ("userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3)',
    [user.id, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};



// Login user
const login = async (email, password) => {
  const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
  
  if (userResult.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = userResult.rows[0];
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const tokenHash = await hashPassword(refreshToken);

  await pool.query(
    'INSERT INTO "RefreshToken" ("userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3)',
    [user.id, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};



// Refresh token
const refresh = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokensResult = await pool.query(
      'SELECT * FROM "RefreshToken" WHERE "userId" = $1 AND "revokedAt" IS NULL',
      [decoded.userId]
    );

    const tokens = tokensResult.rows;
    let validToken = null;

    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      throw new Error('Invalid refresh token');
    }

    const userResult = await pool.query('SELECT * FROM "User" WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    const { accessToken } = generateTokens(user.id, user.email, user.role);
    return { accessToken };

  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};



// Get current user profile
const getCurrentUser = async (userId) => {
  const userResult = await pool.query(
    'SELECT id, email, "fullName", phone, role, "createdAt" FROM "User" WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  return userResult.rows[0];
};




// Logout user
const logout = async (userId, refreshToken) => {
  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    await pool.query(
      'UPDATE "RefreshToken" SET "revokedAt" = NOW() WHERE "userId" = $1 AND "revokedAt" IS NULL',
      [userId]
    );

    return { message: 'Logged out successfully' };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateTokens,
  register,
  login,
  refresh,
  getCurrentUser,
  logout,
};