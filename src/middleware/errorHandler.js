/**
 * Error Handling Middleware
 * Centralized error handling for Express.js
 */

import { logger } from "../utils/logger.js";

/**
 * Error handler middleware
 * Catches and formats errors for API responses
 */
export const errorHandler = (err, req, res, next) => {
  logger.error("Request error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Handle known error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: {
        message: err.message,
        type: "validation_error",
      },
    });
  }

  if (err.name === "TimeoutError") {
    return res.status(504).json({
      error: {
        message: "Request timeout",
        type: "timeout_error",
      },
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    error: {
      message,
      type: err.name || "internal_error",
    },
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  logger.warn("Route not found", {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      type: "not_found",
    },
  });
};
