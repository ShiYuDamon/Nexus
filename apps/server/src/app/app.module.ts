import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { DocumentsModule } from './documents/documents.module';
import { RealtimeModule } from './realtime/realtime.module';
import { VersionsModule } from './versions/versions.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true
  }),
  AuthModule,
  UsersModule,
  WorkspaceModule,
  DocumentsModule,
  RealtimeModule,
  VersionsModule,
  CommentsModule],

  controllers: [AppController],
  providers: [AppService]
})export class
AppModule {}