#!/usr/bin/env node









process.on('uncaughtException', (err) => {

});


const logger = {
  log: (...args) => console.log(`[${new Date().toISOString()}]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] 错误:`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] 警告:`, ...args),
  info: (...args) => console.info(`[${new Date().toISOString()}] 信息:`, ...args)
};


if (!process.env.PORT) {
  process.env.PORT = '1234';
}

if (!process.env.HOST) {
  process.env.HOST = 'localhost';
}


logger.log('正在启动Y-WebSocket服务器...');
logger.log(`端口: ${process.env.PORT}`);
logger.log(`主机: ${process.env.HOST}`);


try {

  const { server, wss, activeConnections, activeDocuments } = require('./y-websocket-server');


  logger.log('Y-WebSocket服务器模块已加载');


  logger.log(`服务器URL: http://${process.env.HOST}:${process.env.PORT}`);
  logger.log(`WebSocket URL: ws://${process.env.HOST}:${process.env.PORT}`);


  process.on('SIGINT', () => {
    logger.log('收到SIGINT信号，正在关闭服务器...');


    wss.clients.forEach((client) => {
      client.terminate();
    });


    server.close(() => {
      logger.log('服务器已关闭');
      process.exit(0);
    });


    setTimeout(() => {
      logger.error('服务器无法在5秒内关闭，强制退出');
      process.exit(1);
    }, 5000);
  });


  setInterval(() => {
    const totalConnections = wss.clients.size;
    const totalDocuments = activeDocuments.size;

    logger.info(`服务器状态 - 连接数: ${totalConnections}, 文档数: ${totalDocuments}`);
  }, 60000);

} catch (error) {
  logger.error('启动Y-WebSocket服务器时出错:', error);
  process.exit(1);
}
