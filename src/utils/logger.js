/**
 * Logger Utility
 * Simple structured logging for the application
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const getTimestamp = () => new Date().toISOString();

const formatLog = (level, message, meta = {}) => {
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...meta
  };
  
  const timestamp = getTimestamp();
  if (process.env.NODE_ENV === 'development') {
    const logFn = level === LOG_LEVELS.ERROR ? console.error
      : level === LOG_LEVELS.WARN ? console.warn
      : console.log;
    logFn(`[${timestamp}] [${level}]`, message, meta);
  } else {
    const logFn = level === LOG_LEVELS.ERROR ? console.error
      : level === LOG_LEVELS.WARN ? console.warn
      : console.log;
    logFn(JSON.stringify(logEntry));
  }
  
  return logEntry;
};

export const logger = {
  error: (message, meta = {}) => formatLog(LOG_LEVELS.ERROR, message, meta),
  warn: (message, meta = {}) => formatLog(LOG_LEVELS.WARN, message, meta),
  info: (message, meta = {}) => formatLog(LOG_LEVELS.INFO, message, meta),
  debug: (message, meta = {}) => {
    if (process.env.DEBUG) {
      formatLog(LOG_LEVELS.DEBUG, message, meta);
    }
  }
};
