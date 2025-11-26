const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiter for login endpoint - prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login endpoint
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Check if environment variables are set
    if (!adminUsername || !adminPassword) {
      return res.status(500).json({
        success: false,
        message: 'Server authentication not configured. Please set ADMIN_USERNAME and ADMIN_PASSWORD in .env'
      });
    }

    // Validate username
    if (username !== adminUsername) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Validate password
    // Check if password is already hashed (starts with $2a$ or $2b$)
    let isPasswordValid;
    if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
      // Password is hashed, use bcrypt compare
      isPasswordValid = await bcrypt.compare(password, adminPassword);
    } else {
      // Password is plain text (for simplicity in .env), compare directly
      isPasswordValid = password === adminPassword;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Generate JWT token
    const token = generateToken({
      username: adminUsername,
      role: 'admin'
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        username: adminUsername,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

// Verify token endpoint (optional - for checking if token is still valid)
router.get('/verify', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
