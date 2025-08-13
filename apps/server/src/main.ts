




import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any) {
    const logger = new Logger('WebSocketAdapter');

    const cors = {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    };


    options = {
      ...options,
      cors,
      transports: ['websocket', 'polling'],
      pingTimeout: 10000,
      pingInterval: 5000
    };

    const server = super.createIOServer(port, options);


    server.on('connection', (socket) => {

      socket.on('disconnect', (reason) => {
      });
    });

    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = '';
  app.setGlobalPrefix(globalPrefix);


  const uploadsPath = join(process.cwd(), 'uploads');


  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/'
  });


  app.useWebSocketAdapter(new CustomIoAdapter(app));


  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  });


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 应用程序已启动: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
