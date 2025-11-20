/**
 * Logger Utility Module
 * Provides standardized logging with different severity levels
 * @module logger
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(level = LogLevel.INFO) {
    this.level = level;
    this.logHistory = [];
    this.maxHistorySize = 100;
  }

  setLevel(level) {
    this.level = level;
  }

  _log(level, levelName, message, ...args) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      args,
    };

    // Store in history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Console output
    const consoleMethod = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] [${levelName}]`, message, ...args);
  }

  debug(message, ...args) {
    this._log(LogLevel.DEBUG, 'DEBUG', message, ...args);
  }

  info(message, ...args) {
    this._log(LogLevel.INFO, 'INFO', message, ...args);
  }

  warn(message, ...args) {
    this._log(LogLevel.WARN, 'WARN', message, ...args);
  }

  error(message, ...args) {
    this._log(LogLevel.ERROR, 'ERROR', message, ...args);
  }

  getHistory() {
    return this.logHistory;
  }

  clearHistory() {
    this.logHistory = [];
  }
}

// Create global logger instance
const logger = new Logger(LogLevel.INFO);

// Make available globally (for browser compatibility)
if (typeof window !== 'undefined') {
  window.logger = logger;
  window.LogLevel = LogLevel;
}
