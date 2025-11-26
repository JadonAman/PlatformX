const { body, param, query, validationResult } = require('express-validator');
const { ErrorCodes, createError } = require('../utils/errorCodes');

/**
 * Validation middleware creator
 * Runs validation rules and returns errors if any
 */
function validate(validations) {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_FAILED.code,
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    next();
  };
}

/**
 * Common validation rules
 */
const ValidationRules = {
  // App name validation
  appName: () => [
    body('appName')
      .trim()
      .isLength({ min: 3, max: 63 })
      .withMessage('App name must be between 3 and 63 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('App name can only contain lowercase letters, numbers, and hyphens')
      .not().matches(/^-|-$/)
      .withMessage('App name cannot start or end with a hyphen')
      .not().matches(/--/)
      .withMessage('App name cannot contain consecutive hyphens')
  ],

  // App slug validation (for params)
  appSlug: () => [
    param('slug')
      .trim()
      .isLength({ min: 3, max: 63 })
      .withMessage('App slug must be between 3 and 63 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Invalid app slug format')
  ],

  // Git repository URL validation
  gitRepoUrl: () => [
    body('repoUrl')
      .trim()
      .notEmpty()
      .withMessage('Repository URL is required')
      .matches(/^(https?:\/\/.+|git@.+:.+|git:\/\/.+)/)
      .withMessage('Invalid Git repository URL')
  ],

  // Branch name validation
  branchName: () => [
    body('branch')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Branch name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9/_.-]+$/)
      .withMessage('Invalid branch name format')
  ],

  // Entry file validation
  entryFile: () => [
    body('entryFile')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Entry file must be between 1 and 255 characters')
      .not().matches(/\.\./)
      .withMessage('Entry file cannot contain directory traversal')
  ],

  // App type validation
  appType: () => [
    body('appType')
      .optional()
      .isIn(['backend', 'frontend', 'fullstack'])
      .withMessage('App type must be backend, frontend, or fullstack')
  ],

  // Environment variables validation
  envVars: () => [
    body('envVars')
      .optional()
      .isObject()
      .withMessage('Environment variables must be an object')
  ],

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Status validation
  status: () => [
    query('status')
      .optional()
      .isIn(['active', 'disabled', 'error'])
      .withMessage('Status must be active, disabled, or error')
  ],

  // MongoDB ObjectId validation
  objectId: (field = 'id') => [
    param(field)
      .isMongoId()
      .withMessage(`Invalid ${field} format`)
  ],

  // Port number validation
  port: () => [
    body('port')
      .optional()
      .isInt({ min: 1, max: 65535 })
      .withMessage('Port must be between 1 and 65535')
  ],

  // Boolean validation
  boolean: (field) => [
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`)
  ]
};

module.exports = {
  validate,
  ValidationRules
};
