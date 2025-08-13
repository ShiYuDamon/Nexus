#!/usr/bin/env node






const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection, getPersistenceAdapter } = require('y-websocket/bin/utils');
const { Log } = require('./utils');


const port = process.env.PORT || 1234;
const host = process.env.HOST || 'localhost';


const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Yjs WebSocket服务器正在运行\n');
});


const wss = new WebSocket.Server({ server });


const activeConnections = new Map();
const activeDocuments = new Map();




wss.on('connection', (conn, req) => {

  const clientIp = req.socket.remoteAddress;


  const docId = req.url.slice(1).split('?')[0] || 'default-document';
  Log.log(`新连接: ${clientIp} - 文档: ${docId}`);


  activeConnections.set(conn, {
    docId,
    ip: clientIp,
    connectedAt: new Date()
  });


  if (!activeDocuments.has(docId)) {
    activeDocuments.set(docId, new Set());
  }
  activeDocuments.get(docId).add(conn);


  setupWSConnection(conn, req, {
    gc: true,
    pingTimeout: 30000,
    docName: docId
  });


  conn.on('close', () => {

    const connInfo = activeConnections.get(conn);
    if (connInfo) {
      Log.log(`连接关闭: ${connInfo.ip} - 文档: ${connInfo.docId}`);


      activeConnections.delete(conn);

      const docConns = activeDocuments.get(connInfo.docId);
      if (docConns) {
        docConns.delete(conn);


        if (docConns.size === 0) {
          activeDocuments.delete(connInfo.docId);
          Log.log(`文档无活跃连接，已清理: ${connInfo.docId}`);
        }
      }
    }
  });

  conn.on('error', (err) => {
    Log.error(`连接错误 [${clientIp}] 文档: ${docId}:`, err);
  });
});


wss.on('error', (error) => {
  Log.error(`WebSocket服务器错误:`, error);
});


server.listen(port, host, () => {
  Log.log(`Yjs WebSocket服务器已启动: http://${host}:${port}`);
});


setInterval(() => {
  const totalConnections = wss.clients.size;
  const totalDocuments = activeDocuments.size;

  Log.log(`活跃连接数: ${totalConnections}`);
  Log.log(`活跃文档数: ${totalDocuments}`);

  if (totalDocuments > 0) {
    Log.log('活跃文档:');
    for (const [docId, connections] of activeDocuments.entries()) {
      Log.log(`- ${docId}: ${connections.size} 个连接`);
    }
  }
}, 30000);


setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000);


process.on('uncaughtException', (err) => {
  Log.error(`未捕获的异常:`, err);
});


process.on('unhandledRejection', (reason, promise) => {
  Log.error(`未处理的Promise拒绝:`, reason);
});


module.exports = { server, wss, activeConnections, activeDocuments };