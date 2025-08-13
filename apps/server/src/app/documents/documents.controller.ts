import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException } from
'@nestjs/common';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentDto,
  DocumentListResponseDto,
  DocumentDetailDto,
  WorkspaceRole } from
'@nexus-main/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceService } from '../workspace/workspace.service';

@Controller('api/documents')
@UseGuards(JwtAuthGuard)export class
DocumentsController {
  constructor(
  private readonly documentsService: DocumentsService,
  private readonly workspaceService: WorkspaceService)
  {}

  @Post()
  async create(
    @Body()createDocumentDto: CreateDocumentDto,
    @Request()req)
  : Promise<DocumentDto> {

    const workspaceId = createDocumentDto.workspaceId;
    const userId = req.user.userId;

    const workspace = await this.workspaceService.findOne(workspaceId, userId);
    const member = workspace.members.find((m) => m.userId === userId);

    if (!member) {
      throw new ForbiddenException('您不是该工作区的成员，无法创建文档');
    }

    if (member.role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('访客无法创建文档，请联系工作区管理员');
    }

    return this.documentsService.create(createDocumentDto, userId);
  }

  @Get('recent')
  async findRecent(
    @Request()req,
    @Query('limit')limit = '5')
  : Promise<DocumentListResponseDto> {
    return this.documentsService.findRecentByUser(
      req.user.userId,
      parseInt(limit, 10)
    );
  }

  @Get(':id')
  async findOne(
    @Param('id')id: string,
    @Request()req)
  : Promise<DocumentDetailDto> {
    const hasAccess = await this.documentsService.checkUserAccess(
      id,
      req.user.userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('您没有权限访问此文档');
    }
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id')id: string,
    @Body()updateDocumentDto: UpdateDocumentDto,
    @Request()req)
  : Promise<DocumentDto> {

    const document = await this.documentsService.findOne(id);
    const userId = req.user.userId;


    const workspace = await this.workspaceService.findOne(
      document.workspaceId,
      userId
    );
    const member = workspace.members.find((m) => m.userId === userId);


    if (member && member.role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('访客无法编辑文档，请联系工作区管理员');
    }


    const isAuthor = document.authorId === userId;
    const isOwnerOrAdmin =
    member && (
    member.role === WorkspaceRole.OWNER ||
    member.role === WorkspaceRole.ADMIN);
    const isMember = member && member.role === WorkspaceRole.MEMBER;

    if (!isAuthor && !isOwnerOrAdmin && !isMember) {
      throw new ForbiddenException('您没有权限修改此文档');
    }

    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  async remove(@Param('id')id: string, @Request()req): Promise<void> {

    const document = await this.documentsService.findOne(id);
    const userId = req.user.userId;


    const isAuthor = document.authorId === userId;

    if (!isAuthor) {

      const workspace = await this.workspaceService.findOne(
        document.workspaceId,
        userId
      );
      const member = workspace.members.find((m) => m.userId === userId);

      const isOwnerOrAdmin =
      member && (
      member.role === WorkspaceRole.OWNER ||
      member.role === WorkspaceRole.ADMIN);

      if (!isOwnerOrAdmin) {
        throw new ForbiddenException('您没有权限删除此文档');
      }
    }

    return this.documentsService.remove(id);
  }
}

@Controller('api/workspaces/:workspaceId/documents')
@UseGuards(JwtAuthGuard)export class
WorkspaceDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findByWorkspace(
    @Param('workspaceId')workspaceId: string,
    @Query('page')page = '1',
    @Query('limit')limit = '10')
  : Promise<DocumentListResponseDto> {
    return this.documentsService.findByWorkspace(
      workspaceId,
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }
}