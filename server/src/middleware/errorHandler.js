const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function publicMessage(err) {
  if (err.message?.includes('GOOGLE_APPLICATION_CREDENTIALS') || err.message?.includes('firebase-service-account.json')) {
    return 'Firebase service account file is missing or invalid. Check GOOGLE_APPLICATION_CREDENTIALS in .env.';
  }

  return err.isOperational ? err.message : 'Internal server error';
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((error) => error.message);
    return res.status(422).json({ message: 'Validation failed', details });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value already exists', fields: err.keyValue });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource identifier' });
  }

  const response = {
    message: publicMessage(err),
  };

  if (statusCode >= 500 || !err.isOperational) {
    logger.error('request_error', {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      error: err.message,
      stack: err.stack,
    });
  }

  if (err instanceof AppError && err.details) {
    response.details = err.details;
  }

  if (!isProduction) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = errorHandler;
