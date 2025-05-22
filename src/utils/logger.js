const { createLogger, format, transports } = require('winston');
const path = require('path');

// Custom format with emojis
const logFormat = format.printf(({ timestamp, level, message, stack }) => {
  const emojis = {
    error: '💥',
    warn: '⚠️',
    info: '💫',
    debug: '🔍'
  };
  
  const emoji = emojis[level] || '📝';
  const logMessage = stack || message;
  
  return `${timestamp} ${emoji} [${level.toUpperCase()}]: ${logMessage}`;
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize(),
    logFormat
  ),
  transports: [
    // Console transport
    new transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    
    // File transport for all logs
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      )
    }),
    
    // Separate file for errors
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      )
    })
  ],
  exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Add custom methods
logger.success = (message) => {
  logger.info(`✅ ${message}`);
};

logger.fail = (message) => {
  logger.error(`❌ ${message}`);
};

logger.telegram = (userId, action, message) => {
  logger.info(`📱 [${userId}] ${action}: ${message}`);
};

logger.whatsapp = (userId, action, message) => {
  logger.info(`📞 [${userId}] ${action}: ${message}`);
};

logger.autoAccept = (userId, groupName, number, action) => {
  logger.info(`✅ [${userId}] Auto-Accept in "${groupName}": ${action} ${number}`);
};

module.exports = logger;