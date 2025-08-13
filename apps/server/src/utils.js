




class Log {
  static log(...args) {
    console.log(`[${new Date().toISOString()}]`, ...args);
  }

  static error(...args) {
    console.error(`[${new Date().toISOString()}] 错误:`, ...args);
  }

  static warn(...args) {
    console.warn(`[${new Date().toISOString()}] 警告:`, ...args);
  }

  static info(...args) {
    console.info(`[${new Date().toISOString()}] 信息:`, ...args);
  }

  static debug(...args) {
    if (process.env.DEBUG) {
      console.debug(`[${new Date().toISOString()}] 调试:`, ...args);
    }
  }
}

module.exports = {
  Log
};
