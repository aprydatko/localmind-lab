/**
 * API Error Response Helper
 * Consistent error handling across controllers
 */

export const sendApiError = (res, error, defaults = { statusCode: 500, type: 'internal_error' }) => {
  if (res.headersSent) {
    return false;
  }

  // Timeout errors → 504
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return res.status(504).json({
      error: { message: 'Request timeout', type: 'timeout_error' }
    });
  }

  // Validation errors → 400
  if (error.name === 'ValidationError' || error.code === 'ERR_ASSERTION') {
    return res.status(400).json({
      error: { message: error.message, type: 'validation_error' }
    });
  }

  // Network/fetch errors → 502
  if (error.type === 'request' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(502).json({
      error: { message: error.message || 'Bad gateway', type: 'bad_gateway' }
    });
  }

  // Default → 500
  const statusCode = error.statusCode || defaults.statusCode;
  const type = error.type || defaults.type;
  return res.status(statusCode).json({
    error: { message: error.message || 'Internal server error', type }
  });
};
