/**
 * Template App - Main Routes
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// GET / - Home page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// GET /about
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});

// GET /health
router.get('/health', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/health.html'));
});

module.exports = router;
