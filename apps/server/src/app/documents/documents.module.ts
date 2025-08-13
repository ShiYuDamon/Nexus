import { Module } from '@nestjs/common';
import {
  DocumentsController,
  WorkspaceDocumentsController } from
'./documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [WorkspaceModule],
  controllers: [DocumentsController, WorkspaceDocumentsController],
  providers: [DocumentsService, PrismaService],
  exports: [DocumentsService]
})export class
DocumentsModule {}