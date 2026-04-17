const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
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
  const existingUser = await pool.query('SELECT * FROM "users" WHERE email = $1', [email]);
  
  if (existingUser.rows.length > 0) {
    throw new Error('Email already in use');
  }

  const userId = uuidv4();
  const passwordHash = await hashPassword(password);

  const userResult = await pool.query(
    'INSERT INTO "users" (id, email, "password_hash", "full_name", phone, role, "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, email, "full_name", role',
    [userId, email, passwordHash, fullName, phone, 'citizen']
  );

  const user = userResult.rows[0];
  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const tokenHash = await hashPassword(refreshToken);
  const refreshTokenId = uuidv4();

  await pool.query(
    'INSERT INTO "refresh_tokens" (id, "user_id", "token_hash", "expires_at", "created_at") VALUES ($1, $2, $3, $4, NOW())',
    [refreshTokenId, user.id, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};



// Login user
const login = async (email, password) => {
  const userResult = await pool.query('SELECT * FROM "users" WHERE email = $1', [email]);
  
  if (userResult.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
  const tokenHash = await hashPassword(refreshToken);
  const refreshTokenId = uuidv4();

  await pool.query(
    'INSERT INTO "refresh_tokens" (id, "user_id", "token_hash", "expires_at", "created_at") VALUES ($1, $2, $3, $4, NOW())',
    [refreshTokenId, user.id, tokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
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
      'SELECT * FROM "refresh_tokens" WHERE "user_id" = $1 AND "revoked_at" IS NULL',
      [decoded.userId]
    );

    const tokens = tokensResult.rows;
    let validToken = null;

    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.token_hash);
      if (match) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      throw new Error('Invalid refresh token');
    }

    const userResult = await pool.query('SELECT * FROM "users" WHERE id = $1', [decoded.userId]);
    
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
    'SELECT id, email, "full_name", phone, role, "created_at" FROM "users" WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
    createdAt: user.created_at,
  };
};




// Logout user
const logout = async (userId, refreshToken) => {
  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    await pool.query(
      'UPDATE "refresh_tokens" SET "revoked_at" = NOW() WHERE "user_id" = $1 AND "revoked_at" IS NULL',
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