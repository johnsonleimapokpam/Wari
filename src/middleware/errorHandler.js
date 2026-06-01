const ApiError = require('../utils/ApiError');

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: {
        code: error.code,
        details: error.details
      }
    });
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.errors
      }
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      error: {
        code: 'UNIQUE_VIOLATION'
      }
    });
  }

  if (error.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'Related resource not found',
      error: {
        code: 'FOREIGN_KEY_VIOLATION'
      }
    });
  }

  if (error.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Constraint violation',
      error: {
        code: 'CHECK_VIOLATION'
      }
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: {
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
};

module.exports = {
  errorHandler
};
