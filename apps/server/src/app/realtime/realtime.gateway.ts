import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsResponse } from
'@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';

const { setupWSConnection } = require('y-websocket/bin/utils');

import { Logger } from '@nestjs/common';

interface RoomClient {
  clientId: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io',
  serveClient: false,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})export class
RealtimeGateway implements
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);


  private docs = new Map<string, Y.Doc>();
  private rooms: Map<string, RoomClient[]> = new Map();

  afterInit(server: Server) {

    server.engine.on('connection_error', (err) => {
      this.logger.error(`连接错误: ${err.message}`, err.stack);
    });
  }

  handleConnection(client: Socket) {


    const room = client.handshake.query.room as string;
    if (room) {
      this.joinRoom(client, room);
    }


    client.emit('connection-established', {
      id: client.id,
      message: '已成功连接到WebSocket服务器',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnect(client: Socket) {


    this.rooms.forEach((clients, roomName) => {
      const clientIndex = clients.findIndex((c) => c.socketId === client.id);
      if (clientIndex !== -1) {
        const removedClient = clients[clientIndex];
        clients.splice(clientIndex, 1);
        this.rooms.set(roomName, clients);


        client.to(roomName).emit('user-left', {
          clientId: removedClient.clientId,
          socketId: client.id,
          room: roomName
        });

      }
    });
  }


  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {room: string;clientId?: string;})
  {
    const { room } = data;
    if (!room) return;

    this.joinRoom(client, room);
    return { event: 'room-joined', data: { room } };
  }


  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {room: string;})
  {
    const { room } = data;
    if (!room) return;

    this.leaveRoom(client, room);
    return { event: 'room-left', data: { room } };
  }


  @SubscribeMessage('ydoc-update')
  handleDocUpdate(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {update: any;room: string;})
  {
    const { update, room } = data;
    if (!update || !room) return;

    try {

      const updateData = Array.isArray(update) ? update : Object.values(update);


      client.to(room).emit('ydoc-update', {
        update: updateData,
        room,
        from: client.id
      });

    } catch (error) {
    }

    return { event: 'update-received', data: { success: true } };
  }


  @SubscribeMessage('awareness-update')
  handleAwarenessUpdate(
    @ConnectedSocket()client: Socket,
    @MessageBody()
  data: {field: string;value: any;room: string;clientId: number;})
  {
    const { field, value, room, clientId } = data;
    if (!field || !room || clientId === undefined) return;

    try {

      client.to(room).emit('awareness-update', {
        field,
        value,
        room,
        clientId,
        from: client.id
      });


      if (field === 'user') {
        const roomClients = this.rooms.get(room) || [];
        const clientIndex = roomClients.findIndex(
          (c) => c.socketId === client.id
        );

        if (clientIndex !== -1) {

          roomClients[clientIndex].clientId = clientId.toString();
        }
      }
    } catch (error) {
      this.logger.error(`处理awareness更新时出错: ${error.message}`);
    }

    return { event: 'awareness-received', data: { success: true } };
  }


  @SubscribeMessage('sync-request')
  handleSyncRequest(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {room: string;})
  {
    const { room } = data;
    if (!room) return;


    try {

      const roomClients = this.rooms.get(room) || [];
     

      client.to(room).emit('sync-request', {
        room,
        from: client.id
      });
    } catch (error) {
      this.logger.error(`处理同步请求时出错: ${error.message}`);
    }

    return { event: 'sync-requested', data: { success: true } };
  }


  @SubscribeMessage('comment-created')
  handleCommentCreated(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;comment: any;})
  {
    const { documentId, comment } = data;
   

    client.to(`document-${documentId}`).emit('comment-created', {
      comment,
      from: client.id
    });

    return { event: 'comment-broadcast', data: { success: true } };
  }

  @SubscribeMessage('comment-updated')
  handleCommentUpdated(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;comment: any;})
  {
    const { documentId, comment } = data;
    
    client.to(`document-${documentId}`).emit('comment-updated', {
      comment,
      from: client.id
    });

    return { event: 'comment-update-broadcast', data: { success: true } };
  }

  @SubscribeMessage('comment-resolved')
  handleCommentResolved(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;commentId: string;isResolved: boolean;})
  {
    const { documentId, commentId, isResolved } = data;
    
    client.to(`document-${documentId}`).emit('comment-resolved', {
      commentId,
      isResolved,
      from: client.id
    });

    return { event: 'comment-resolution-broadcast', data: { success: true } };
  }


  @SubscribeMessage('version-created')
  handleVersionCreated(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;version: any;})
  {
    const { documentId, version } = data;
    
    client.to(`document-${documentId}`).emit('version-created', {
      version,
      from: client.id
    });

    return { event: 'version-broadcast', data: { success: true } };
  }

  @SubscribeMessage('version-restored')
  handleVersionRestored(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;versionId: string;})
  {
    const { documentId, versionId } = data;
    
    client.to(`document-${documentId}`).emit('version-restored', {
      versionId,
      from: client.id
    });

    return { event: 'version-restore-broadcast', data: { success: true } };
  }


  @SubscribeMessage('user-status-update')
  handleUserStatusUpdate(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: {documentId: string;status: any;})
  {
    const { documentId, status } = data;
    
    client.to(`document-${documentId}`).emit('user-status-update', {
      status,
      from: client.id
    });

    return { event: 'user-status-broadcast', data: { success: true } };
  }


  @SubscribeMessage('test-message')
  handleTestMessage(
    @ConnectedSocket()client: Socket,
    @MessageBody()data: any)
  : WsResponse<any> {
    

    return {
      event: 'test-response',
      data: {
        message: `服务器收到消息: ${data.message || '无内容'}`,
        receivedAt: new Date().toISOString(),
        clientId: client.id
      }
    };
  }


  broadcastMessage(message: string) {
    this.server.emit('broadcast', {
      message,
      timestamp: new Date().toISOString()
    });
    return true;
  }


  private joinRoom(client: Socket, room: string) {
    try {

      client.join(room);


      const clientId =
      client.handshake.query.clientId ||
      `client-${Math.floor(Math.random() * 1000000)}`;


      const roomClients = this.rooms.get(room) || [];
      const existingClientIndex = roomClients.findIndex(
        (c) => c.socketId === client.id
      );

      if (existingClientIndex === -1) {
        roomClients.push({
          clientId: clientId as string,
          socketId: client.id
        });
        this.rooms.set(room, roomClients);
      } else {

        roomClients[existingClientIndex].clientId = clientId as string;
      }



      setTimeout(() => {

        client.to(room).emit('user-joined', {
          clientId,
          socketId: client.id,
          room
        });
      }, 500);
    } catch (error) {
      this.logger.error(`客户端加入房间时出错: ${error.message}`);
    }
  }


  private leaveRoom(client: Socket, room: string) {

    client.leave(room);


    const roomClients = this.rooms.get(room) || [];
    const clientIndex = roomClients.findIndex((c) => c.socketId === client.id);

    if (clientIndex !== -1) {
      const removedClient = roomClients[clientIndex];
      roomClients.splice(clientIndex, 1);
      this.rooms.set(room, roomClients);


      client.to(room).emit('user-left', {
        clientId: removedClient.clientId,
        socketId: client.id,
        room
      });


    }
  }
}
